document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の参照を確実に取得
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const resultsContainer = document.getElementById('results-container');
    const initialMessage = document.getElementById('initial-message'); // 初期メッセージ要素

    const videoDetailContainer = document.getElementById('video-detail-container');
    const closeVideoDetailButton = document.getElementById('close-video-detail-button');

    // Video Detail Elements (これらの要素は動画詳細がロードされるたびにinnerHTMLで再生成されるため、
    // 親コンテナのvideoDetailContainerを操作する方が確実です。)

    // Channel Detail Modal Elements
    const channelDetailModal = document.getElementById('channel-detail-modal');
    const closeChannelDetailButton = document.getElementById('close-channel-detail-button');
    const channelModalName = document.getElementById('channel-modal-name');
    const channelModalIcon = document.getElementById('channel-modal-icon');
    const channelModalSubscribers = document.getElementById('channel-modal-subscribers');
    const channelModalViews = document.getElementById('channel-modal-views');
    const channelModalDescription = document.getElementById('channel-modal-description');

    // CORSに対応しているInvidiousインスタンスのURLを選択してください
    // 動作しない場合は、https://docs.invidious.io/instances/ でCORSが緑色のインスタンスを試してください。
    // いくつか試して、最も安定しているものを選んでください。
    const INVIDIOUS_INSTANCE_URL = 'https://lekker.gay'; // 動作報告が多いインスタンス
    // const INVIDIOUS_INSTANCE_URL = 'https://invidious.nameless.ws';
    // const INVIDIOUS_INSTANCE_URL = '';
    // const INVIDIOUS_INSTANCE_URL = 'https://inv.vern.cc';


    // イベントリスナーの設定
    if (searchButton) { // 要素が存在するか確認
        searchButton.addEventListener('click', performSearch);
    }
    if (searchInput) { // 要素が存在するか確認
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                performSearch();
            }
        });
    }
    if (closeVideoDetailButton) {
        closeVideoDetailButton.addEventListener('click', hideVideoDetail);
    }
    if (closeChannelDetailButton) {
        closeChannelDetailButton.addEventListener('click', hideChannelDetail);
    }
    if (channelDetailModal) {
        channelDetailModal.addEventListener('click', (event) => {
            // モーダルの背景をクリックした場合に閉じる
            if (event.target === channelDetailModal) {
                hideChannelDetail();
            }
        });
    }

    async function performSearch() {
        const query = searchInput.value.trim();
        if (!query) {
            resultsContainer.innerHTML = `<p class="col-span-full text-center text-gray-600 text-lg py-12">検索キーワードを入力してください。</p>`;
            hideVideoDetail();
            hideChannelDetail(); // チャンネル詳細も非表示に
            return;
        }

        resultsContainer.innerHTML = `<p class="col-span-full text-center text-gray-600 text-lg py-12">検索中...</p>`;
        hideVideoDetail(); // 検索時は動画詳細を非表示に
        hideChannelDetail(); // チャンネル詳細も非表示に

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

            data.forEach(item => {
                if (item.type === 'video') { // 'video'タイプのみを対象
                    const videoCard = document.createElement('div');
                    videoCard.classList.add(
                        'bg-white', 'rounded-lg', 'shadow-md', 'overflow-hidden',
                        'hover:shadow-lg', 'transform', 'hover:-translate-y-1', 'transition', 'duration-300'
                    );
                    
                    const thumbnailUrl = item.videoThumbnails && item.videoThumbnails.length > 0
                                        ? item.videoThumbnails[0].url
                                        : 'https://via.placeholder.com/320x180?text=No+Thumbnail';
                    
                    // チャンネルアイコンのURLを探す
                    const channelIconUrl = item.authorThumbnails && item.authorThumbnails.length > 0
                                           ? item.authorThumbnails[0].url
                                           : 'https://via.placeholder.com/48x48?text=Channel'; // デフォルトアイコン

                    videoCard.innerHTML = `
                        <img src="${thumbnailUrl}" alt="${item.title}" data-video-id="${item.videoId}"
                             class="w-full h-48 object-cover cursor-pointer">
                        <div class="p-4">
                            <h3 class="text-lg font-semibold text-gray-800 mb-2 truncate">${item.title}</h3>
                            <div class="flex items-center gap-2 mt-2">
                                <img src="${channelIconUrl}" alt="${item.author}" data-channel-id="${item.authorId}"
                                     class="w-8 h-8 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-blue-400">
                                <p class="text-sm text-gray-600">${item.author}</p>
                            </div>
                        </div>
                    `;
                    resultsContainer.appendChild(videoCard);

                    // サムネイルクリックで動画詳細表示
                    videoCard.querySelector('img[data-video-id]').addEventListener('click', (event) => {
                        const videoId = event.target.dataset.videoId;
                        fetchVideoDetails(videoId);
                    });

                    // チャンネルアイコンクリックでチャンネル詳細表示
                    videoCard.querySelector('img[data-channel-id]').addEventListener('click', (event) => {
                        const channelId = event.target.dataset.channelId;
                        fetchChannelDetails(channelId);
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
            <button id="close-video-detail-button"
                    class="absolute top-4 right-4 bg-gray-200 text-gray-700 px-4 py-2 rounded-full hover:bg-gray-300 transition duration-300 text-sm">
                閉じる
            </button>
            <p class="text-center text-gray-600 text-lg py-12">動画情報を読み込み中...</p>
        `;
        videoDetailContainer.classList.add('video-detail-visible'); // 詳細表示コンテナを表示
        hideChannelDetail(); // チャンネル詳細が開いていたら閉じる

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
            videoDetailContainer.innerHTML = `
                <button id="close-video-detail-button"
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
            // 新しく生成された要素なので、ここでイベントリスナーを再度追加
            document.getElementById('close-video-detail-button').addEventListener('click', hideVideoDetail);

        } catch (error) {
            console.error('動画詳細の取得中にエラーが発生しました:', error);
            videoDetailContainer.innerHTML = `
                <button id="close-video-detail-button"
                        class="absolute top-4 right-4 bg-gray-200 text-gray-700 px-4 py-2 rounded-full hover:bg-gray-300 transition duration-300 text-sm">
                    閉じる
                </button>
                <p class="text-center text-red-500 text-lg py-12">動画詳細の取得中にエラーが発生しました。もう一度お試しください。</p>
            `;
            document.getElementById('close-video-detail-button').addEventListener('click', hideVideoDetail);
        }
    }

    async function fetchChannelDetails(channelId) {
        // チャンネル詳細モーダルをローディング表示
        channelModalName.textContent = 'チャンネル情報を読み込み中...';
        channelModalIcon.src = 'https://via.placeholder.com/96x96?text=Loading';
        channelModalSubscribers.textContent = '';
        channelModalViews.textContent = '';
        channelModalDescription.innerHTML = '';
        channelDetailModal.classList.add('channel-detail-visible'); // モーダルを表示
        channelDetailModal.classList.remove('channel-detail-hidden');

        // 動画詳細と検索結果を一時的に非表示に
        hideVideoDetail();
        resultsContainer.style.display = 'none';

        try {
            const response = await fetch(`${INVIDIOUS_INSTANCE_URL}/api/v1/channels/${channelId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const channel = await response.json();

            // チャンネル登録者数と総再生回数のフォーマット
            const subscriberCountFormatted = channel.subCount ? new Intl.NumberFormat('ja-JP').format(channel.subCount) : '非公開';
            const totalViewsFormatted = channel.viewCount ? new Intl.NumberFormat('ja-JP').format(channel.viewCount) : '非公開';

            // チャンネルアイコンのURLを探す
            const channelIcon = channel.authorThumbnails && channel.authorThumbnails.length > 0
                               ? channel.authorThumbnails[0].url
                               : 'https://via.placeholder.com/96x96?text=Channel'; // デフォルトアイコン

            channelModalName.textContent = channel.author;
            channelModalIcon.src = channelIcon;
            channelModalSubscribers.textContent = subscriberCountFormatted;
            channelModalViews.textContent = totalViewsFormatted;
            channelModalDescription.innerHTML = channel.descriptionHtml || '説明はありません。';

        } catch (error) {
            console.error('チャンネル詳細の取得中にエラーが発生しました:', error);
            channelModalName.textContent = 'エラー';
            channelModalSubscribers.textContent = '';
            channelModalViews.textContent = '';
            channelModalDescription.innerHTML = '<p class="text-center text-red-500 text-lg py-4">チャンネル詳細の取得中にエラーが発生しました。</p>';
        }
    }

    function hideVideoDetail() {
        videoDetailContainer.classList.remove('video-detail-visible');
        videoDetailContainer.classList.add('video-detail-hidden');
        resultsContainer.style.display = 'grid'; // 検索結果コンテナを再表示
    }

    function hideChannelDetail() {
        channelDetailModal.classList.remove('channel-detail-visible');
        channelDetailModal.classList.add('channel-detail-hidden');
        resultsContainer.style.display = 'grid'; // 検索結果コンテナを再表示
    }
});
