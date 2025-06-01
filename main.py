# main.py
from flask import Flask, render_template, request
import requests
import json
import os

app = Flask(__name__)

# ★★★ ここをあなたのInvidiousインスタンスURLに置き換えてください ★★★
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

    # ここから動画ストリームURLの取得ロジック
    video_stream_url = ""
    # Invidiousの/embed/パス（iframe用）
    embed_invidious_url = ""
    if video_data and video_data.get('videoId'):
        embed_invidious_url = f"{INVIDIOUS_INSTANCE_URL}/embed/{video_data.get('videoId')}"

        # APIから直接再生可能な動画ストリームURLを探す
        if 'format' in video_data and isinstance(video_data['format'], list):
            # 優先: 720pのMP4
            for fmt in video_data['format']:
                if fmt.get('container') == 'mp4' and fmt.get('qualityLabel') == '720p' and 'url' in fmt:
                    video_stream_url = fmt['url']
                    break
            # 720pがなければ、最初のMP4を試す
            if not video_stream_url:
                for fmt in video_data['format']:
                    if fmt.get('container') == 'mp4' and 'url' in fmt:
                        video_stream_url = fmt['url']
                        break

    return render_template(
        'results.html',
        search_query=search_query,
        search_results=search_results,
        video_data=video_data,
        invidious_instance=INVIDIOUS_INSTANCE_URL,
        embed_invidious_url=embed_invidious_url,
        video_stream_url=video_stream_url # 新しく追加した変数
    )

if __name__ == '__main__':
    # ローカル開発環境での実行
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
