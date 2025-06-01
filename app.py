from flask import Flask, render_template, request, jsonify
import yt_dlp
import json
import requests

app = Flask(__name__)

# 提供されたInvidious URLのリスト
INVIDIOUS_INSTANCES = {
    'video': [
        'https://cal1.iv.ggtyler.dev/', 'https://iv.ggtyler.dev/', 'https://invidious.perennialte.ch/',
        'https://invidious.nikkosphere.com/', 'https://cal1.iv.ggtyler.dev/', 'https://invidious.nerdvpn.de/',
        'https://invidious.f5.si/', 'https://iv.nboeck.de/', 'https://clover-pitch-position.glitch.me/',
        'https://lekker.gay/', 'https://id.420129.xyz/', 'https://lekker.gay/',
        'https://invidious.dhusch.de/', 'https://invidious.tiekoetter.com/', 'https://yt.yoc.ovh/',
        'https://yewtu.be/', 'https://inv.zzls.xyz/', 'https://inv.us.projectsegfau.lt/',
        'https://cal1.iv.ggtyler.dev/', 'https://invidious.schenkel.eti.br/', 'https://iv.melmac.space/',
        'https://lekker.gay/', 'https://vro.omcat.info/', 'https://invidious.nerdvpn.de/',
        'https://id.420129.xyz/', 'https://subscriptions.gir.st/', 'https://iteroni.com/',
        'https://iv.datura.network/', 'https://inv.nadeko.net/', 'https://inv.nadeko.net/',
        'https://invidious.f5.si/', 'https://invidious.f5.si/', 'https://pol1.iv.ggtyler.dev/',
        'https://invidious.reallyaweso.me*', 'https://invidious.f5.si/', 'https://invidious.lunivers.trade/',
        'https://cal1.iv.ggtyler.dev/', 'https://pol1.iv.ggtyler.dev/', 'https://pol1.iv.ggtyler.dev/',
        'https://youtube.mosesmang.com/', 'https://invidious.exma.de/', 'https://invi.susurrando.com/',
        'https://iv.ggtyler.dev/', 'https://lekker.gay/', 'https://usa-proxy2.poketube.fun/',
        'https://inv.vern.cc/', 'https://eu-proxy.poketube.fun/', 'https://invidious.qwik.space/',
        'https://invidious.catspeed.cc/', 'https://invidious.fdn.fr/', 'https://yt.thechangebook.org/',
        'https://usa-proxy2.poketube.fun/', 'https://rust.oskamp.nl/', 'https://invidious.adminforge.de',
        'https://siawaseok-wakame-server2.glitch.me/', 'https://cal1.iv.ggtyler.dev/',
        'https://inst1.inv.catspeed.cc/', 'https://invidious.darkness.service/', 'https://invid-api.poketube.fun/',
        'https://invidious.private.coffee/', 'https://usa-proxy.poketube.fun/', 'https://invidious.projectsegfau.lt/',
        'ttps://invid-api.poketube.fun/', 'https://iv.duti.dev/', 'https://yewtu.be/',
        'https://nyc1.iv.ggtyler.dev/', 'https://nyc1.iv.ggtyler.dev/', 'https://materialious.nadeko.net/',
        'https://invidious.nerdvpn.de/', 'https://iv.melmac.space/', 'https://eu-proxy.poketube.fun/',
        'https://invidious.einfachzocken.eu/', 'https://invidious.jing.rocks/', 'https://yt.artemislena.eu/',
        'https://invidious.private.coffee/', 'https://inst2.inv.catspeed.cc/', 'https://iv.duti.dev/',
        'https://iv.melmac.space/'
    ],
    'search': [
        'https://lekker.gay/', 'https://lekker.gay/', 'https://nyc1.iv.ggtyler.dev/', 'https://lekker.gay/',
        'https://iv.ggtyler.dev/', 'ttps://invid-api.poketube.fun/', 'https://iv.melmac.space/',
        'https://cal1.iv.ggtyler.dev/', 'https://invidious.f5.si/', 'https://yt.artemislena.eu/'
    ],
    'channel': [
        'https://invidious.lunivers.trade/', 'https://siawaseok-wakame-server2.glitch.me', 'https://yewtu.be/',
        'https://invidious.tiekoetter.com/', 'https://lekker.gay/', 'https://lekker.gay/',
        'https://nyc1.iv.ggtyler.dev/', 'https://lekker.gay/', 'https://iv.ggtyler.dev/',
        'https://invid-api.poketube.fun/'
    ],
    'playlist': [
        'https://invidious.schenkel.eti.br/', 'https://invidious.nikkosphere.com/', 'https://pol1.iv.ggtyler.dev/',
        'https://invidious.lunivers.trade/', 'https://cal1.iv.ggtyler.dev/', 'https://nyc1.iv.ggtyler.dev/',
        'https://iv.ggtyler.dev/', 'https://siawaseok-wakame-server2.glitch.me/', 'https://invidious.0011.lt/',
        'https://invidious.nietzospannend.nl/', 'https://youtube.mosesmang.com/', 'https://iv.melmac.space/',
        'https://lekker.gay/'
    ],
    'comments': [
        'https://lekker.gay/', 'https://lekker.gay/', 'https://iv.ggtyler.dev', 'https://pol1.iv.ggtyler.dev/',
        'https://cal1.iv.ggtyler.dev/', 'https://invidious.nietzospannend.nl/'
    ]
}

# --- YouTube/Invidious API関連の関数 ---

def get_invidious_api_url(instance_type='search'):
    """指定されたタイプの利用可能なInvidiousインスタンスURLを返す"""
    # エラー処理や、動作しないインスタンスのスキップなどを追加すると良い
    urls = INVIDIOUS_INSTANCES.get(instance_type, [])
    if urls:
        # 簡易的に最初のURLを返す。実際はランダム選択やヘルスチェックが必要
        return urls[0].replace('https://invid-api.poketube.fun/', 'https://invid-api.poketube.fun') # 末尾の余分なスラッシュを調整
    return None

def search_videos(query):
    """Invidiousインスタンスを使って動画を検索する"""
    search_instance = get_invidious_api_url('search')
    if not search_instance:
        return {"error": "No Invidious search instance available."}
    
    # Invidious APIの検索エンドポイントは通常 /api/v1/search
    # 注意: InvidiousのバージョンやインスタンスによってAPIパスが異なる場合があります。
    # 正確なAPIドキュメントを参照してください。
    api_url = f"{search_instance.rstrip('/')}/api/v1/search?q={query}"
    
    try:
        response = requests.get(api_url)
        response.raise_for_status() # HTTPエラーがあれば例外を発生
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching search results from Invidious: {e}")
        return {"error": f"Failed to fetch search results: {e}"}

def get_video_info_ytdlp(video_id_or_url):
    """yt-dlpを使って動画の情報を取得する"""
    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', # MP4フォーマット優先
        'noplaylist': True,
        'quiet': True, # 標準出力に詳細を出さない
        'simulate': True, # ダウンロードせずに情報のみ取得
        'force_generic_extractor': True, # YouTube以外のサイトにも対応
        'dump_single_json': True, # 結果をJSONで出力
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # yt-dlpはYouTubeのURLだけでなく、ビデオIDも扱えます
            info = ydl.extract_info(video_id_or_url, download=False)
            
            # 利用可能なフォーマットを抽出
            formats = []
            if 'formats' in info:
                for f in info['formats']:
                    if 'url' in f and 'ext' in f and f['ext'] in ['mp4', 'webm']: # MP4/WebMのみ
                        formats.append({
                            'format_id': f.get('format_id'),
                            'ext': f.get('ext'),
                            'resolution': f.get('resolution') or f.get('height') or f.get('format_note'), # 解像度
                            'url': f['url'],
                            'vcodec': f.get('vcodec'),
                            'acodec': f.get('acodec')
                        })
            
            return {
                'title': info.get('title'),
                'thumbnail': info.get('thumbnail'),
                'formats': formats # 抽出したフォーマットリスト
            }
    except Exception as e:
        print(f"Error getting video info with yt-dlp: {e}")
        return {"error": f"Failed to get video info: {e}"}

def get_comments(video_id):
    """Invidiousインスタンスを使ってコメントを取得する (youtube.jsの役割をPythonで代替)"""
    comments_instance = get_invidious_api_url('comments')
    if not comments_instance:
        return {"error": "No Invidious comments instance available."}

    # Invidious APIのコメントエンドポイントは通常 /api/v1/comments/<video_id>
    api_url = f"{comments_instance.rstrip('/')}/api/v1/comments/{video_id}"

    try:
        response = requests.get(api_url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching comments from Invidious: {e}")
        return {"error": f"Failed to fetch comments: {e}"}

# --- Flaskルート ---

@app.route('/')
def index():
    """トップページを表示"""
    return render_template('index.html')

@app.route('/search', methods=['GET'])
def search():
    """検索リクエストを処理し、結果をJSONで返す"""
    query = request.args.get('q', '')
    if not query:
        return jsonify({"error": "No search query provided."}), 400
    
    results = search_videos(query)
    return jsonify(results)

@app.route('/video_info', methods=['GET'])
def video_info():
    """yt-dlpを使って動画情報を取得し、JSONで返す"""
    video_url = request.args.get('url', '')
    video_id = request.args.get('id', '')

    if not video_url and not video_id:
        return jsonify({"error": "No video URL or ID provided."}), 400

    info = get_video_info_ytdlp(video_url if video_url else video_id)
    return jsonify(info)

@app.route('/comments', methods=['GET'])
def fetch_comments():
    """コメントをフェッチし、JSONで返す"""
    video_id = request.args.get('id', '')
    if not video_id:
        return jsonify({"error": "No video ID provided."}), 400
    
    comments = get_comments(video_id)
    return jsonify(comments)

if __name__ == '__main__':
    # デバッグモードは開発用です。本番環境では無効にしてください。
    app.run(debug=True, port=5000)
