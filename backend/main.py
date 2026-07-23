from dotenv import load_dotenv
load_dotenv()

import os
from openai import OpenAI
import os
from fastapi import FastAPI
from pydantic import BaseModel
from ingestion import collection, ingest_repo_stream
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import json



# Identify if any word is Camel case 
def is_code_identifier(word: str) -> bool:
    if any(c.isupper() and word[i-1].islower() for i,c in enumerate(word)):
        return True
    return False

# Check if words are code identifiers
def extract_keywords(text: str) -> list[str]:
    words = text.split()
    return [w for w in words if is_code_identifier(w)]

def keyword_search(keywords: list[str], collection, repo_path: str = "") -> list[dict]: 
    if not keywords:
        return []
    
    all_chunks = collection.get(
        limit=3000,  
        where={"repo": {"$eq": repo_path}} if repo_path else None
    )
    matches = []
    
    for i, doc in enumerate(all_chunks['documents']):
        if any(keyword in doc for keyword in keywords):
            matches.append({"text": doc, "metadatas": all_chunks['metadatas'][i]})
        
    return matches

def merge_matches_and_chunks(keyword_matches: list[dict], sources: dict) -> list[dict]:
    scores = {} # key: unique_id, value: {"text":..., "metadatas":..., "score": int}
    
    # add semantic results with score 1
    for i in range(len(sources["documents"][0])):
        text = sources["documents"][0][i]
        metadata = sources["metadatas"][0][i]
        key = f"{metadata['file']}:{metadata['start_line']}"
        scores[key] = {'text': text, 'metadatas': metadata, 'score':1}
        
    # add keyword matches, if key exists increment score else add new
    for match in keyword_matches:
        key = f"{match['metadatas']['file']}: {match['metadatas']['start_line']}"
        if key in scores: 
            scores[key]['score'] += 1
        else:
            scores[key] = {'text': match['text'], 'metadatas': match['metadatas'], 'score':1}
        
    # sort by score descending and return as a list
    sorted_scores = sorted(scores.items(), key=lambda item:item[1]['score'], reverse=True)
    
    return sorted_scores


# instance to query openai
client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY"),
)

# instance of api
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IngestRequest(BaseModel): 
    repo_path: str
    supported_extensions: list[str] = [".ts", ".tsx", ".java", ".py", ".js", ".md"]
    skip_dirs: list[str] = ["node_modules", ".git", "build", "dist", "frontend_license", "venv", "target", "docs", ".vscode", ".venv"]

    
@app.post("/ingest-stream")
def ingest_stream(request: IngestRequest):
    def generate():
        # count total files first
        for update in ingest_repo_stream(request.repo_path, request.supported_extensions, request.skip_dirs):
            yield f"data: {json.dumps(update)}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")

# request body
class QuestionRequest(BaseModel):
    question: str
    repo_path: str = ""


# answer user's query
@app.post("/ask")
def ask(request: QuestionRequest) :
    input_text = request.question
    real_input_text = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are a code search assistant. Convert the users question into a short plain English phrase that describes what the code looks like. Do NOT use operators, regex, or special characters. Output only the phrase, nothing else. Example: New Row button onClick handleCreateData renderTopToolbarCustomActions"
            },
            {
                "role": "user",
                "content": input_text 
            }
        ],
        model="gpt-4o-mini"
    ).choices[0].message.content.strip()
    
    
    # find key words from input and check if code identifier
    keywords_for_search = extract_keywords(real_input_text)
    # find key word matches in documents from ingestion
    matched_keywords = keyword_search(keywords_for_search, collection, request.repo_path)
    
    # Semantic search
    sources = collection.query(
        query_texts=[real_input_text],
        n_results=20,
        where={"repo": {"$eq": request.repo_path}} if request.repo_path else {"file": {"$not_contains": "README"}}
     # Omit README from collection and get chunks from path
    )
    
    '''
    merge matched keywords with semantic chunk search
    attach a score that increases when either semantic or keyword match in that chunk
    display results in reverse order so highest scores first
    ''' 
    results = merge_matches_and_chunks(matched_keywords, sources)    

    # print("All retrieved chunks:")
    # for i in range(len(sources['metadatas'][0])):
    #     print(sources['metadatas'][0][i])
        
    # print(f"Rewritten query: {real_input_text}")
    # print(f"Top chunk: {sources['metadatas'][0][0]}")
    
    
    # Format result
    source = ""
    for key, value in results:
        meta = value['metadatas']
        text = value['text']
        source += f"File: {meta['file']} (lines {meta['start_line']}-{meta['end_line']})\n{text}\n\n"
    

    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are a code assistant. Answer questions using ONLY the provided code chunks. Always cite the file name and line numbers your answer comes from. If the answer isn't in the chunks, say so."
            },
            {
                "role": "user",
                "content": input_text + "\n\n" + "Here are some relevant code chunks:\n\n" + source
            }
        ],
        model="gpt-4o-mini"
    )
    
    # Agent response
    return {"Response": chat_completion.choices[0].message.content, "Source": source}
