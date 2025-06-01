document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const resultsContainer = document.getElementById('results-container');
    const videoDetailContainer = document.getElementById('video-detail-container');
    const closeDetailButton = document.getElementById('close-detail-button');

    // CORSに対応しているInvidiousインスタンスのURLを選択してください
    // 複数の選択肢をコメントアウトで示します。動作しない場合は別のインスタンスを試してください。
    // https://docs.invidious.io/instances/ にて最新のインスタンスを確認できます。
    const INVIDIOUS_INSTANCE_URL = 'https://lekker.gay'; // 例: 動作確認済みの場合が多い
    // const INVIDIOUS_INSTANCE_URL = 'https://inv.tux.pizza';
    // const INVIDIOUS_INSTANCE_URL = 'https://invidious.snopyta.org'; // CORSが動作しない可能性あり

    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            performSearch();
        }
    });
    closeDetailButton.addEventListener('click', hideVideoDetail);

    async function performSearch() {
        const query = searchInput.value.trim();
        if (!query) {
            resultsContainer.innerHTML = '<p class="initial-message">検索キーワードを入力してください。</p>';
            hideVideoDetail();
            return;
        }

        resultsContainer.innerHTML = '<p class="loading-message">検索中...</p>';
        hideVideoDetail(); // 検索時には動画詳細を非表示にする

        try {
            const response = await fetch(`${INVIDIOUS_INSTANCE_URL}/api/v1/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            resultsContainer.innerHTML = ''; // 以前の結果をクリア

            if (data.length === 0) {
                resultsContainer.innerHTML = '<p class="initial-message">検索結果が見つかりませんでした。</p>';
                return;
            }

            data.forEach(video => {
                // 'video'タイプのみを対象にする (playlistやchannelを除外)
                if (video.type === 'video') {
                    const videoCard = document.createElement('div');
                    videoCard.classList.add('video-card');
                    
                    // サムネイルURLが存在しない場合のフォールバック
                    const thumbnailUrl = video.videoThumbnails && video.videoThumbnails.length > 0
                                        ? video.videoThumbnails[0].url
                                        : 'https://via.placeholder.com/320x180?text=No+Thumbnail'; // プレースホルダー画像

                    videoCard.innerHTML = `
                        <img src="${thumbnailUrl}" alt="${video.title}" data-video-id="${video.videoId}">
                        <h3>${video.title}</h3>
                        <p>${video.author}</p>
                    `;
                    resultsContainer.appendChild(videoCard);

                    // サムネイルクリックで詳細表示
                    videoCard.querySelector('img').addEventListener('click', (event) => {
                        const videoId = event.target.dataset.videoId;
                        fetchVideoDetails(videoId);
                    });
                }
            });

        } catch (error) {
            console.error('検索中にエラーが発生しました:', error);
            resultsContainer.innerHTML = '<p class="error-message">検索中にエラーが発生しました。別のInvidiousインスタンスを試すか、後でもう一度お試しください。</p>';
        }
    }

    async function fetchVideoDetails(videoId) {
        videoDetailContainer.innerHTML = '<p class="loading-message">動画情報を読み込み中...</p>';
        videoDetailContainer.classList.add('video-detail-visible'); // 詳細表示コンテナを表示

        try {
            const response = await fetch(`${INVIDIOUS_INSTANCE_URL}/api/v1/videos/${videoId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const video = await response.json();

            // 再生回数のフォーマット
            const viewCountFormatted = new Intl.NumberFormat('ja-JP').format(video.viewCount);

            videoDetailContainer.innerHTML = `
                <button id="close-detail-button">閉じる</button>
                <h2>${video.title}</h2>
                <iframe width="100%" height="450" src="${INVIDIOUS_INSTANCE_URL}/embed/${videoId}" frameborder="0" allowfullscreen></iframe>
                <p><strong>チャンネル:</strong> ${video.author}</p>
                <p><strong>再生回数:</strong> ${viewCountFormatted}回</p>
                <div class="description">
                    <h3>説明:</h3>
                    ${video.descriptionHtml || '説明はありません。'}
                </div>
            `;
            // 詳細表示を閉じるときのボタンにイベントリスナーを再設定
            document.getElementById('close-detail-button').addEventListener('click', hideVideoDetail);

            // 検索結果コンテナを非表示に (オプション)
            resultsContainer.style.display = 'none';

        } catch (error) {
            console.error('動画詳細の取得中にエラーが発生しました:', error);
            videoDetailContainer.innerHTML = '<p class="error-message">動画詳細の取得中にエラーが発生しました。もう一度お試しください。</p>';
            // エラー時でも閉じるボタンは表示
            videoDetailContainer.appendChild(closeDetailButton);
            document.getElementById('close-detail-button').addEventListener('click', hideVideoDetail);
        }
    }

    function hideVideoDetail() {
        videoDetailContainer.classList.remove('video-detail-visible');
        videoDetailContainer.innerHTML = ''; // コンテンツをクリア
        resultsContainer.style.display = 'grid'; // 検索結果コンテナを再表示
    }
});
