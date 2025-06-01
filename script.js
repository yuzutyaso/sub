document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const resultsContainer = document.getElementById('results-container');
    const initialMessage = document.getElementById('initial-message');
    const videoDetailContainer = document.getElementById('video-detail-container');
    const closeDetailButton = document.getElementById('close-detail-button');

    const detailTitle = document.getElementById('detail-title');
    const detailIframe = document.getElementById('detail-iframe');
    const detailAuthor = document.getElementById('detail-author');
    const detailViews = document.getElementById('detail-views');
    const detailDescription = document.getElementById('detail-description');

    // CORSに対応しているInvidiousインスタンスのURLを選択してください
    // 動作しない場合は、https://docs.invidious.io/instances/ でCORSが緑色のインスタンスを試してください。
    const INVIDIOUS_INSTANCE_URL = 'https://lekker.gay'; // 例: 動作確認済みの場合が多い

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
            resultsContainer.innerHTML = `<p class="col-span-full text-center text-gray-600 text-lg py-12">検索キーワードを入力してください。</p>`;
            hideVideoDetail();
            return;
        }

        resultsContainer.innerHTML = `<p class="col-span-full text-center text-gray-600 text-lg py-12">検索中...</p>`;
        hideVideoDetail(); // 検索時は動画詳細を非表示に

        try {
            const response = await fetch(`${INVIDIOUS_INSTANCE_URL}/api/v1/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            resultsContainer.innerHTML = ''; // 以前の結果をクリア

            if (data.length === 0) {
                resultsContainer.innerHTML = `<p class="col-span-full text-center text-gray-600 text-lg py-12">検索結果が見つかりませんでした。</p>`;
                return;
            }

            data.forEach(video => {
                if (video.type === 'video') { // 'video'タイプのみを対象
                    const videoCard = document.createElement('div');
                    videoCard.classList.add(
                        'bg-white', 'rounded-lg', 'shadow-md', 'overflow-hidden',
                        'hover:shadow-lg', 'transform', 'hover:-translate-y-1', 'transition', 'duration-300',
                        'cursor-pointer'
                    );
                    
                    const thumbnailUrl = video.videoThumbnails && video.videoThumbnails.length > 0
                                        ? video.videoThumbnails[0].url
                                        : 'https://via.placeholder.com/320x180?text=No+Thumbnail';

                    videoCard.innerHTML = `
                        <img src="${thumbnailUrl}" alt="${video.title}" data-video-id="${video.videoId}"
                             class="w-full h-48 object-cover">
                        <div class="p-4">
                            <h3 class="text-lg font-semibold text-gray-800 mb-2 truncate">${video.title}</h3>
                            <p class="text-sm text-gray-600">${video.author}</p>
                        </div>
                    `;
                    resultsContainer.appendChild(videoCard);

                    videoCard.querySelector('img').addEventListener('click', (event) => {
                        const videoId = event.target.dataset.videoId;
                        fetchVideoDetails(videoId);
                    });
                }
            });

        } catch (error) {
            console.error('検索中にエラーが発生しました:', error);
            resultsContainer.innerHTML = `<p class="col-span-full text-center text-red-500 text-lg py-12">検索中にエラーが発生しました。別のInvidiousインスタンスを試すか、後でもう一度お試しください。</p>`;
        }
    }

    async function fetchVideoDetails(videoId) {
        // 詳細コンテナのコンテンツをクリアし、ローディング表示
        videoDetailContainer.innerHTML = `
            <button id="close-detail-button"
                    class="absolute top-4 right-4 bg-gray-200 text-gray-700 px-4 py-2 rounded-full hover:bg-gray-300 transition duration-300 text-sm">
                閉じる
            </button>
            <p class="text-center text-gray-600 text-lg py-12">動画情報を読み込み中...</p>
        `;
        videoDetailContainer.classList.add('video-detail-visible'); // 詳細表示コンテナを表示

        // 検索結果コンテナを一時的に非表示に
        resultsContainer.style.display = 'none';

        try {
            const response = await fetch(`${INVIDIOUS_INSTANCE_URL}/api/v1/videos/${videoId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const video = await response.json();

            const viewCountFormatted = new Intl.NumberFormat('ja-JP').format(video.viewCount);

            // コンテンツを更新
            detailTitle.textContent = video.title;
            detailIframe.src = `${INVIDIOUS_INSTANCE_URL}/embed/${videoId}`;
            detailAuthor.textContent = video.author;
            detailViews.textContent = viewCountFormatted;
            detailDescription.innerHTML = video.descriptionHtml || '説明はありません。'; // HTML形式で挿入

            // 新しいコンテンツをセット
            videoDetailContainer.innerHTML = `
                <button id="close-detail-button"
                        class="absolute top-4 right-4 bg-gray-200 text-gray-700 px-4 py-2 rounded-full hover:bg-gray-300 transition duration-300 text-sm">
                    閉じる
                </button>
                <div class="flex flex-col lg:flex-row gap-6">
                    <div class="lg:w-2/3">
                        <h2 class="text-3xl font-bold text-gray-900 mb-4">${video.title}</h2>
                        <div class="relative w-full aspect-video bg-gray-200 rounded-lg overflow-hidden">
                            <iframe class="w-full h-full absolute top-0 left-0" src="${INVIDIOUS_INSTANCE_URL}/embed/${videoId}" frameborder="0" allowfullscreen></iframe>
                        </div>
                    </div>
                    <div class="lg:w-1/3">
                        <p class="text-lg text-gray-700 mb-2">
                            <strong class="text-gray-900">チャンネル:</strong> ${video.author}
                        </p>
                        <p class="text-lg text-gray-700 mb-4">
                            <strong class="text-gray-900">再生回数:</strong> ${viewCountFormatted}回
                        </p>
                        <div class="description bg-gray-50 p-4 rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                            <h3 class="text-xl font-semibold text-gray-800 mb-2">説明:</h3>
                            <div class="text-gray-600 leading-relaxed">${video.descriptionHtml || '説明はありません。'}</div>
                        </div>
                    </div>
                </div>
            `;
            // クローズボタンにイベントリスナーを再設定
            document.getElementById('close-detail-button').addEventListener('click', hideVideoDetail);

        } catch (error) {
            console.error('動画詳細の取得中にエラーが発生しました:', error);
            videoDetailContainer.innerHTML = `
                <button id="close-detail-button"
                        class="absolute top-4 right-4 bg-gray-200 text-gray-700 px-4 py-2 rounded-full hover:bg-gray-300 transition duration-300 text-sm">
                    閉じる
                </button>
                <p class="text-center text-red-500 text-lg py-12">動画詳細の取得中にエラーが発生しました。もう一度お試しください。</p>
            `;
            document.getElementById('close-detail-button').addEventListener('click', hideVideoDetail);
        }
    }

    function hideVideoDetail() {
        videoDetailContainer.classList.remove('video-detail-visible');
        videoDetailContainer.classList.add('video-detail-hidden');
        resultsContainer.style.display = 'grid'; // 検索結果コンテナを再表示
    }
});
