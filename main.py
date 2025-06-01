import requests
import json
import os

def get_invidious_video_info(video_id: str, invidious_instance_url: str):
    """
    Invidious APIを使って指定した動画IDの情報を取得します。
    """
    api_url = f"{invidious_instance_url}/api/v1/videos/{video_id}"
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

def search_invidious_videos(query: str, invidious_instance_url: str):
    """
    Invidious APIを使って動画を検索します。
    """
    api_url = f"{invidious_instance_url}/api/v1/search"
    params = {
        'q': query,
        'type': 'video'
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

def generate_html_output(search_query: str, search_results: list, video_data: dict, invidious_instance: str, output_filename: str = "invidious_videos.html"):
    """
    検索結果と単一動画情報を基にHTMLファイルを生成します。
    """
    html_content = f"""
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>簡易Invidiousブラウザ - 検索: {search_query}</title>
        <style>
            body {{ font-family: sans-serif; margin: 20px; background-color: #f0f2f5; color: #333; }}
            .container {{ max-width: 900px; margin: auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
            h1, h2 {{ color: #0056b3; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px; }}
            .video-card, .search-result {{
                display: flex;
                margin-bottom: 20px;
                padding: 15px;
                border: 1px solid #ddd;
                border-radius: 5px;
                background-color: #f9f9f9;
                align-items: flex-start;
            }}
            .video-card img, .search-result img {{
                width: 160px;
                height: 90px;
                margin-right: 15px;
                border-radius: 3px;
                object-fit: cover;
            }}
            .video-info {{ flex-grow: 1; }}
            .video-info h3 {{ margin-top: 0; margin-bottom: 5px; color: #0056b3; }}
            .video-info p {{ margin: 0 0 3px 0; font-size: 0.9em; color: #555; }}
            .embed-container {{
                position: relative;
                padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
                height: 0;
                overflow: hidden;
                max-width: 100%;
                background: #000;
                margin-bottom: 20px;
                border-radius: 5px;
            }}
            .embed-container iframe {{
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border: 0;
            }}
            .no-data {{ color: #888; font-style: italic; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>簡易Invidiousブラウザ</h1>
            <p><strong>使用しているInvidiousインスタンス:</strong> <a href="{invidious_instance}" target="_blank">{invidious_instance}</a></p>

            ---
            <h2>単一動画情報</h2>
    """

    if video_data:
        # Invidiousの埋め込みパス（/embed/）があればそれを使う方が確実
        # 通常のYouTube埋め込みURLのvideoId部分をInvidiousインスタンスの/embed/に置き換える
        embed_invidious_url = f"{invidious_instance}/embed/{video_data.get('videoId', '')}"

        html_content += f"""
            <div class="video-card">
                <img src="{video_data.get('videoThumbnails', [{}])[0].get('url', '')}" alt="動画サムネイル">
                <div class="video-info">
                    <h3><a href="{invidious_instance}/watch?v={video_data.get('videoId', '')}" target="_blank">{video_data.get('title', 'タイトルなし')}</a></h3>
                    <p><strong>チャンネル:</strong> <a href="{invidious_instance}/channel/{video_data.get('authorId', '')}" target="_blank">{video_data.get('author', '不明')}</a></p>
                    <p><strong>再生回数:</strong> {video_data.get('viewCount', 'N/A'):,}</p>
                    <p><strong>公開日:</strong> {video_data.get('publishedText', 'N/A')}</p>
                    <p><strong>長さ:</strong> {video_data.get('lengthSeconds', 'N/A')}秒</p>
                </div>
            </div>
            """
        # Invidiousの/embed/パスを使ったiframe埋め込み
        html_content += f"""
            <h3>動画埋め込み</h3>
            <div class="embed-container">
                <iframe src="{embed_invidious_url}" frameborder="0" allowfullscreen></iframe>
            </div>
            """
    else:
        html_content += """<p class="no-data">動画情報を取得できませんでした。</p>"""

    html_content += f"""
            ---
            <h2>「{search_query}」の検索結果</h2>
    """

    if search_results:
        for i, video in enumerate(search_results):
            if video.get('type') == 'video':
                html_content += f"""
            <div class="search-result">
                <a href="{invidious_instance}/watch?v={video.get('videoId', '')}" target="_blank">
                    <img src="{video.get('videoThumbnails', [{}])[0].get('url', '')}" alt="サムネイル">
                </a>
                <div class="video-info">
                    <h3><a href="{invidious_instance}/watch?v={video.get('videoId', '')}" target="_blank">{video.get('title', 'タイトルなし')}</a></h3>
                    <p><strong>チャンネル:</strong> <a href="{invidious_instance}/channel/{video.get('authorId', '')}" target="_blank">{video.get('author', '不明')}</a></p>
                    <p><strong>再生回数:</strong> {video.get('viewCount', 'N/A'):,}</p>
                    <p><strong>長さ:</strong> {video.get('lengthSeconds', 'N/A')}秒</p>
                </div>
            </div>
            """
            elif video.get('type') == 'channel':
                html_content += f"""
            <div class="search-result">
                <a href="{invidious_instance}/channel/{video.get('channelId', '')}" target="_blank">
                    <img src="{video.get('authorThumbnails', [{}])[0].get('url', '')}" alt="チャンネルアイコン" style="border-radius: 50%;">
                </a>
                <div class="video-info">
                    <h3><a href="{invidious_instance}/channel/{video.get('channelId', '')}" target="_blank">{video.get('author', 'チャンネル名不明')}</a></h3>
                    <p><strong>タイプ:</strong> チャンネル</p>
                    <p><strong>登録者数:</strong> {video.get('subCount', 'N/A')}</p>
                </div>
            </div>
            """
    else:
        html_content += """<p class="no-data">検索結果がありませんでした。</p>"""

    html_content += """
        </div>
    </body>
    </html>
    """

    with open(output_filename, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"\nHTMLファイル '{output_filename}' が生成されました。ブラウザで開いてください。")
    print(f"ファイルパス: {os.path.abspath(output_filename)}")

if __name__ == "__main__":
    # 指定されたInvidiousインスタンスのURL
    invidious_instance = "https://lekker.gay" 

    # --- 検索と動画情報の取得 ---
    search_query = input("検索キーワードを入力してください: ")
    example_video_id = "dQw4w9WgXcQ" # 例として固定の動画ID
    
    print(f"キーワード '{search_query}' で {invidious_instance} を検索中...")
    search_results = search_invidious_videos(search_query, invidious_instance)

    print(f"動画ID: {example_video_id} の情報を {invidious_instance} から取得中...")
    video_data = get_invidious_video_info(example_video_id, invidious_instance)

    # --- HTMLファイルの生成 ---
    generate_html_output(search_query, search_results, video_data, invidious_instance)
