import sys, os, asyncio, httpx
sys.path.append(os.getcwd())
from app.config import settings

async def test():
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{settings.LLM_BASE_URL.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer INVALID_KEY_TEST"},
            json={"model": settings.LLM_MODEL, "messages": [
                {"role": "user", "content": "hello"}
            ]}
        )
        print('STATUS:', response.status_code)
        print('BODY:', response.text)

if __name__ == '__main__':
    asyncio.run(test())
