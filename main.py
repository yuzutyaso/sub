# main.py
from flask import Flask, render_template, request
import requests
import json
import os

app = Flask(__name__)

# ★★★ ここをあなたのInvidiousインスタンスURLに置き換えてください ★★★
# https://lekker.gay が安定していることを確認してください。
# もしVercelデプロイ後に動かない場合は、他の安定したインスタンスを試してください。
INVIDIOUS_INSTANCE_URL = "https://lekker.gay" 

def get_invidious_video_info(video_id: str):
    """
    Invidious APIを使って指定した動画IDの情報を取得します。
    """
    api_url = f"{INVIDIOUS_INSTANCE_URL}/api/v1/videos/{video_id}"
    try:
        response = requests.get(api_url)
        response.raise_for_status()
        video_info = response.json()
        return video_info
    except requests.exceptions.RequestException as e:
        print(f"APIリクエスト中にエラーが発生しました: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"JSONの解析中にエラーが発生しました: {e}")
        return None

def search_invidious_videos(query: str):
    """
    Invidious APIを使って動画を検索します。
    """
    api_url = f"{INVIDIOUS_INSTANCE_URL}/api/v1/search"
    params = {
        'q': query,
        'type': 'video' # 動画のみを検索対象とする
    }
    try:
        response = requests.get(api_url, params=params)
        response.raise_for_status()
        search_results = response.json()
        return search_results
    except requests.exceptions.RequestException as e:
        print(f"検索APIリクエスト中にエラーが発生しました: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"検索結果のJSON解析中にエラーが発生しました: {e}")
        return None

@app.route('/')
def index():
    """
    検索フォームを表示するトップページ
    """
    return render_template('index.html')

@app.route('/search', methods=['GET'])
def search():
    """
    検索結果と単一動画情報を表示するページ
    """
    search_query = request.args.get('query', '') # URLのクエリパラメータから検索キーワードを取得

    # 例として固定の動画ID
    example_video_id = "dQw4w9WgXcQ" # Rick Astley - Never Gonna Give You Up

    search_results = []
    if search_query: # 検索キーワードがある場合のみ検索を実行
        print(f"キーワード '{search_query}' で {INVIDIOUS_INSTANCE_URL} を検索中...")
        search_results = search_invidious_videos(search_query)

    print(f"動画ID: {example_video_id} の情報を {INVIDIOUS_INSTANCE_URL} から取得中...")
    video_data = get_invidious_video_info(example_video_id)

    # 埋め込み用Stream URLの取得 (Invidiousの/embed/パスを使用)
    embed_invidious_url = ""
    if video_data and video_data.get('videoId'):
        embed_invidious_url = f"{INVIDIOUS_INSTANCE_URL}/embed/{video_data.get('videoId')}"

    return render_template(
        'results.html',
        search_query=search_query,
        search_results=search_results,
        video_data=video_data,
        invidious_instance=INVIDIOUS_INSTANCE_URL,
        embed_invidious_url=embed_invidious_url
    )

if __name__ == '__main__':
    # ローカル開発環境での実行
    app.run(debug=True) # debug=True は開発時のみ推奨
