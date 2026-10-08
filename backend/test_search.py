import sys, os, asyncio, httpx
sys.path.append(os.getcwd())
import json

async def test():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # login
        login_res = await client.post('http://localhost:8000/api/v1/auth/login', json={'email': 'work@gmail.com', 'password': 'Newuser@123'})
        token = login_res.json()['data']['access_token']
        # get workspace
        me_res = await client.get('http://localhost:8000/api/v1/auth/me', headers={'Authorization': f'Bearer {token}'})
        ws_id = me_res.json()['data']['workspaces'][0]['id']
        # search
        search_res = await client.post('http://localhost:8000/api/v1/search', json={'workspace_id': ws_id, 'query': 'hello', 'top_k': 10}, headers={'Authorization': f'Bearer {token}'})
        print('STATUS:', search_res.status_code)
        try:
            print('BODY:', search_res.json())
        except:
            print('BODY TEXT:', search_res.text)

if __name__ == '__main__':
    asyncio.run(test())
