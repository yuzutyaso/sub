document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const videoList = document.getElementById('videoList');
    const videoPlayer = document.getElementById('videoPlayer');
    const videoTitle = document.getElementById('videoTitle');
    const qualitySelector = document.getElementById('qualitySelector');
    const commentList = document.getElementById('commentList');

    // 検索機能
    searchButton.addEventListener('click', async () => {
        const query = searchInput.value;
        if (query) {
            try {
                const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
                const data = await response.json();
                displaySearchResults(data.items); // Invidious APIのレスポンス構造による
            } catch (error) {
                console.error('Error fetching search results:', error);
                videoList.innerHTML = '<li>検索結果の取得に失敗しました。</li>';
            }
        }
    });

    function displaySearchResults(videos) {
        videoList.innerHTML = ''; // 既存のリストをクリア
        if (videos && videos.length > 0) {
            videos.forEach(video => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <img src="${video.videoThumbnails[0].url}" alt="${video.title}" width="120">
                    <div>
                        <a href="#" data-videoid="${video.videoId}">${video.title}</a>
                        <p>${video.author}</p>
                    </div>
                `;
                li.querySelector('a').addEventListener('click', (e) => {
                    e.preventDefault();
                    playVideo(video.videoId);
                });
                videoList.appendChild(li);
            });
        } else {
            videoList.innerHTML = '<li>動画が見つかりませんでした。</li>';
        }
    }

    // 動画再生機能
    async function playVideo(videoId) {
        try {
            // 動画情報を取得 (yt-dlp経由)
            const videoInfoResponse = await fetch(`/video_info?id=${videoId}`);
            const videoInfo = await videoInfoResponse.json();

            if (videoInfo.error) {
                alert(`動画情報の取得に失敗しました: ${videoInfo.error}`);
                return;
            }

            videoTitle.textContent = videoInfo.title;
            
            // 利用可能な画質オプションを表示
            qualitySelector.innerHTML = '画質: ';
            const selectElement = document.createElement('select');
            videoInfo.formats.sort((a,b) => (b.height || 0) - (a.height || 0)).forEach(format => {
                if (format.url) { // URLが存在するもののみ
                    const option = document.createElement('option');
                    option.value = format.url;
                    option.textContent = `${format.resolution || format.format_id} (${format.ext})`;
                    selectElement.appendChild(option);
                }
            });
            qualitySelector.appendChild(selectElement);

            selectElement.addEventListener('change', () => {
                videoPlayer.src = selectElement.value;
                videoPlayer.play();
            });

            // デフォルトで最も良い（または最初の）画質を再生
            if (videoInfo.formats.length > 0) {
                videoPlayer.src = videoInfo.formats[0].url;
                videoPlayer.play();
            } else {
                alert('利用可能な動画フォーマットが見つかりませんでした。');
            }

            // コメントを取得
            const commentsResponse = await fetch(`/comments?id=${videoId}`);
            const commentsData = await commentsResponse.json();
            displayComments(commentsData.comments); // Invidious APIのレスポンス構造による

        } catch (error) {
            console.error('Error playing video or fetching info/comments:', error);
            alert('動画の再生または情報の取得に失敗しました。');
        }
    }

    function displayComments(comments) {
        commentList.innerHTML = '';
        if (comments && comments.length > 0) {
            comments.forEach(comment => {
                const div = document.createElement('div');
                div.className = 'comment-item';
                div.innerHTML = `
                    <strong>${comment.author}</strong> (${new Date(comment.publishedText).toLocaleDateString()}):
                    <p>${comment.content}</p>
                `;
                commentList.appendChild(div);
            });
        } else {
            commentList.innerHTML = '<p>コメントはありません。</p>';
        }
    }

    // ページロード時に何か表示したい場合 (例: 人気動画リストなど)
    // ここに初期コンテンツ取得のロジックを追加できます。
});
