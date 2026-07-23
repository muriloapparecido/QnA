const BASE = 'http://localhost:8000'

export async function askQuestion(question: string, repoPath:string) {
    const response = await fetch(`${BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, repo_path: repoPath }),
    });

    if (response.status === 429 || response.status === 500) {
        throw new Error('QUOTA_EXCEEDED')
    }


    if (!response.ok) throw new Error(`Server error: ${response.status}`);
    return response.json(); 

}

export async function ingestStream( repoPath: string, supportedExtensions: string[], skipDirs: string [], signal: AbortSignal) {
    const response = await fetch(`${BASE}/ingest-stream`, {
        signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            repo_path: repoPath,
            supported_extensions: supportedExtensions,
            skip_dirs: skipDirs,
        }),
    });
    return response; 
}