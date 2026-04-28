from fastapi import FastAPI

app = FastAPI(title="DB Query API")


@app.get("/")
async def root():
    return {"message": "DB Query API is running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
