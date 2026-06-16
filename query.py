from dotenv import load_dotenv
load_dotenv()

import os

from openai import OpenAI

import os
import chromadb


chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="repo")

client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY"),
)

print("What would you like to ask?")
chat_completion = None
while True:
    
    input_text = input()
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
    
    
    sources = collection.query(
        query_texts=[real_input_text],
        n_results=10
    )
    print(f"Rewritten query: {real_input_text}")
    print(f"Top chunk: {sources['metadatas'][0][0]}")
    
    source = ""
    for i  in range(5):
        meta = sources["metadatas"][0][i]
        text = sources["documents"][0][i]
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
    
    print(chat_completion.choices[0].message.content)
    
    print("Any further questions? (Type 'exit' or 'quit' to stop.)")
    if input_text.lower() in {"exit", "quit"}:
        break





