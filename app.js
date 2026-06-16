// 2026 Seoul Travel Planner App Logic
document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle Initialization
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    
    // Read theme preference from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    htmlElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
    
    function updateThemeIcon(theme) {
        const icon = themeToggleBtn.querySelector('i');
        if (theme === 'dark') {
            icon.className = 'fa-solid fa-sun';
        } else {
            icon.className = 'fa-solid fa-moon';
        }
    }

    // Load Data
    const jsonUrl = 'seoul_trip.json';
    
    fetch(jsonUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('無法載入行程資料庫檔案！');
            }
            return response.json();
        })
        .then(data => {
            renderTripData(data);
        })
        .catch(err => {
            console.error(err);
            document.getElementById('trip-title').innerText = '載入錯誤！';
            document.getElementById('trip-subtitle').innerText = err.message;
        });

    function renderTripData(trip) {
        // 1. Title & Hero
        const titleEl = document.getElementById('trip-title');
        titleEl.classList.remove('loading-text');
        titleEl.innerText = trip.title;
        document.getElementById('trip-subtitle').innerText = trip.subtitle;
        
        // Members list parsing for quick stats
        const membersList = trip.members.map(m => m.name).join(', ');
        document.getElementById('stat-members').innerText = `${trip.members.length} 人 (${membersList})`;
        
        // 2. Countdown Calculator (Target: 2026-07-25)
        const targetDate = new Date(trip.startDate + 'T00:00:00');
        const currentDate = new Date();
        // Reset hours to get exact date difference
        targetDate.setHours(0,0,0,0);
        currentDate.setHours(0,0,0,0);
        
        const diffTime = targetDate - currentDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const countdownNumEl = document.getElementById('countdown-days');
        const countdownLabelEl = document.querySelector('.countdown-label');
        const countdownUnitEl = document.querySelector('.countdown-unit');
        
        if (diffDays > 0) {
            countdownNumEl.innerText = diffDays;
        } else if (diffDays === 0) {
            countdownLabelEl.innerText = '今天就是';
            countdownNumEl.innerText = '出發';
            countdownUnitEl.innerText = '日！✈️';
            countdownNumEl.style.color = '#ef4444';
        } else {
            countdownLabelEl.innerText = '旅程於';
            countdownNumEl.innerText = trip.startDate;
            countdownUnitEl.innerText = ' 順利開展！';
            countdownNumEl.style.fontSize = '18px';
        }

        // 3. Stats
        document.getElementById('stat-days').innerText = `${trip.itinerary.length} 天`;
        if (trip.accommodations && trip.accommodations.length > 0) {
            document.getElementById('stat-accommodation').innerText = trip.accommodations[0].name;
        }

        // 4. Map Loader
        const mapIframe = document.getElementById('google-map-iframe');
        const mapLoader = document.getElementById('map-loader');
        const mapAppLink = document.getElementById('google-map-app-link');
        
        if (trip.googleMapIframe) {
            mapIframe.src = trip.googleMapIframe;
            mapIframe.addEventListener('load', () => {
                mapLoader.classList.add('hide');
            });
            mapAppLink.href = trip.googleMapAppUrl;
        } else {
            mapLoader.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> 未設定 Google 地圖連結';
        }

        // 5. Day Tabs & Timeline
        const dayTabsContainer = document.getElementById('day-tabs');
        const timelineContainer = document.getElementById('timeline');
        
        // Add "All Days" Tab
        const allTab = document.createElement('button');
        allTab.className = 'day-tab-btn active';
        allTab.innerHTML = '<span class="day-num">全部行程</span><span class="day-date">All Days</span>';
        allTab.addEventListener('click', () => switchDayTab('all'));
        dayTabsContainer.appendChild(allTab);

        trip.itinerary.forEach(day => {
            // Day Tab Button
            const tabBtn = document.createElement('button');
            tabBtn.className = 'day-tab-btn';
            tabBtn.setAttribute('data-day', day.day);
            
            // Format short date (MM/DD)
            const dateObj = new Date(day.date);
            const shortDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()} (${day.dayOfWeek})`;
            
            tabBtn.innerHTML = `
                <span class="day-num">D${day.day}</span>
                <span class="day-date">${shortDate}</span>
            `;
            tabBtn.addEventListener('click', () => switchDayTab(day.day));
            dayTabsContainer.appendChild(tabBtn);

            // Generate Today's Google Maps Route URL (driving mode for taxi)
            let routeUrl = '';
            if (day.spots && day.spots.length > 0) {
                const validSpots = day.spots.filter(s => s.lat && s.lng);
                if (validSpots.length > 1) {
                    const origin = validSpots[0];
                    const dest = validSpots[validSpots.length - 1];
                    const waypoints = validSpots.slice(1, -1);
                    
                    routeUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}`;
                    if (waypoints.length > 0) {
                        const waypointsStr = waypoints.map(w => `${w.lat},${w.lng}`).join('%7C');
                        routeUrl += `&waypoints=${waypointsStr}`;
                    }
                    routeUrl += `&travelmode=driving`;
                }
            }

            // Day Block in Timeline
            const dayBlock = document.createElement('div');
            dayBlock.className = 'day-block';
            dayBlock.id = `day-block-${day.day}`;
            
            dayBlock.innerHTML = `
                <div class="day-header">
                    <div class="day-title-wrap">
                        <h3>Day ${day.day} - ${day.date} (${day.dayOfWeek})</h3>
                        <span class="day-theme">${day.theme}</span>
                    </div>
                    ${routeUrl ? `
                        <a href="${routeUrl}" target="_blank" class="day-route-btn">
                            <i class="fa-solid fa-route"></i> 今日計程車路線導航
                        </a>
                    ` : ''}
                </div>
                <div class="day-body">
                    <!-- Spots items go here -->
                </div>
            `;
            
            const dayBody = dayBlock.querySelector('.day-body');
            
            day.spots.forEach(spot => {
                const item = document.createElement('div');
                item.className = 'timeline-item';
                
                // Classify spot tags
                let tagHtml = '';
                if (spot.description.includes('計程車') || spot.description.includes('車程')) {
                    tagHtml += `<span class="tag tag-taxi"><i class="fa-solid fa-taxi"></i> 計程車</span> `;
                }
                if (spot.description.includes('避暑') || spot.description.includes('室內') || spot.description.includes('冷氣')) {
                    tagHtml += `<span class="tag tag-indoor"><i class="fa-solid fa-snowflake"></i> 室內避暑</span> `;
                }
                if (spot.description.includes('餐') || spot.name.includes('湯') || spot.name.includes('食')) {
                    tagHtml += `<span class="tag tag-food"><i class="fa-solid fa-utensils"></i> 美食</span> `;
                }

                // Spot-level Navigation URL
                let spotNavUrl = '';
                if (spot.lat && spot.lng) {
                    spotNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}&travelmode=driving`;
                }

                item.innerHTML = `
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                        <div class="timeline-meta">
                            <span class="timeline-time">${spot.time}</span>
                            <span class="timeline-spot-name">${spot.name}</span>
                            ${spotNavUrl ? `<a href="${spotNavUrl}" target="_blank" class="spot-nav-link" title="導航至此景點"><i class="fa-solid fa-location-arrow"></i> 導航</a>` : ''}
                            <div class="timeline-tags">${tagHtml}</div>
                        </div>
                        <p class="timeline-desc">${spot.description}</p>
                    </div>
                `;
                dayBody.appendChild(item);
            });
            
            timelineContainer.appendChild(dayBlock);
        });

        function switchDayTab(dayNum) {
            // Update Tab Active State
            const buttons = dayTabsContainer.querySelectorAll('.day-tab-btn');
            buttons.forEach(btn => btn.classList.remove('active'));
            
            if (dayNum === 'all') {
                allTab.classList.add('active');
                // Show all blocks
                const blocks = timelineContainer.querySelectorAll('.day-block');
                blocks.forEach(block => {
                    block.style.display = 'block';
                });
            } else {
                const targetBtn = dayTabsContainer.querySelector(`.day-tab-btn[data-day="${dayNum}"]`);
                if (targetBtn) targetBtn.classList.add('active');
                
                // Hide all and show target
                const blocks = timelineContainer.querySelectorAll('.day-block');
                blocks.forEach(block => {
                    if (block.id === `day-block-${dayNum}`) {
                        block.style.display = 'block';
                        // Smooth scroll to timeline section
                        document.getElementById('itinerary-section').scrollIntoView({ behavior: 'smooth' });
                    } else {
                        block.style.display = 'none';
                    }
                });
            }
        }

        // 6. Render Restaurants (步行美食)
        const restaurantsGrid = document.getElementById('restaurants-grid');
        
        // Define some beautiful matching images for local restaurants
        const restaurantImages = {
            '혜화칼국수 (惠化手刀削麵)': 'https://images.unsplash.com/photo-1612927601601-6638404737ce?q=80&w=600',
            '소녀방앗간 마로니에점 (少女碾米廠 - 馬羅尼埃公園店)': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600',
            '정돈 대학로본점 (正豚 - 大學路本店)': 'https://images.unsplash.com/photo-1598514983318-2f64f7f4796c?q=80&w=600',
            '마지 (Maji 蔬食廟宇飲食)': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=600',
            '익선동 121': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600',
            '순희네빈대떡 (廣藏市場順熙家)': 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=600'
        };

        // If the user's JSON lists the restaurants, render them!
        if (trip.localRestaurants && trip.localRestaurants.length > 0) {
            trip.localRestaurants.forEach(res => {
                const card = document.createElement('div');
                card.className = 'restaurant-card card-glass';
                
                const bgImage = restaurantImages[res.name] || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=600';
                
                let vegLabel = '';
                if (res.type.includes('素') || res.type.includes('菜') || res.name.includes('소녀방앗간') || res.name.includes('마지')) {
                    vegLabel = `<span class="restaurant-badge" style="background-color:#059669"><i class="fa-solid fa-leaf"></i> 鍋邊素友善</span>`;
                } else {
                    vegLabel = `<span class="restaurant-badge" style="background-color:#ea580c"><i class="fa-solid fa-meat"></i> 葷食/小孩愛</span>`;
                }

                let ratingHtml = res.rating 
                    ? `<span class="restaurant-rating" style="font-weight:bold; color:#f59e0b; font-size:0.9em;"><i class="fa-solid fa-star"></i> ${res.rating}</span>`
                    : '';

                let cardHtml = res.orderingCard 
                    ? `<div class="restaurant-card-word" style="font-size: 0.82em; background: rgba(59,130,246,0.06); padding: 6px 10px; border-radius: 6px; margin-top: 8px; border-left: 3px solid #3b82f6; font-family: monospace; display: flex; justify-content: space-between; align-items: center;"><span><strong>🗣️ 韓文點餐：</strong><code>${res.orderingCard}</code></span></div>`
                    : '';

                let groupMenuHtml = '';
                if (res.groupMenu) {
                    groupMenuHtml = `
                        <div class="restaurant-group-menu" style="margin-top: 10px; font-size: 0.82em; border-top: 1px dashed rgba(0,0,0,0.12); padding-top: 8px; line-height: 1.45;">
                            <div style="font-weight: bold; color: #374151; margin-bottom: 5px;"><i class="fa-solid fa-users"></i> 3大1小家庭點餐推薦：</div>
                            <div style="display: grid; gap: 4px; color: #4b5563;">
                                <div><span style="color:#059669; font-weight:bold;">🥬 素食大人：</span>${res.groupMenu.vegetarian}</div>
                                <div><span style="color:#b45309; font-weight:bold;">👴 隨行長輩：</span>${res.groupMenu.senior}</div>
                                <div><span style="color:#2563eb; font-weight:bold;">👦 6歲小孩：</span>${res.groupMenu.child}</div>
                                <div><span style="color:#111827; font-weight:bold;">👥 其他大人：</span>${res.groupMenu.adults}</div>
                            </div>
                        </div>
                    `;
                }

                let orderingTipHtml = res.orderingTip
                    ? `<div style="font-size: 0.8em; color: #dc2626; margin-top: 6px; font-weight: 500; display: flex; align-items: start; gap: 4px;"><i class="fa-solid fa-circle-info" style="margin-top: 2px;"></i> <span><strong>提示：</strong>${res.orderingTip}</span></div>`
                    : '';

                card.innerHTML = `
                    <div class="restaurant-img" style="background-image: url('${bgImage}')">
                        <div class="restaurant-badge-wrap">
                            <span class="restaurant-badge"><i class="fa-solid fa-shoe-prints"></i> ${res.distance}</span>
                            ${vegLabel}
                        </div>
                    </div>
                    <div class="restaurant-info" style="display: flex; flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <h3 style="margin: 0; font-size:1.1em; font-weight:700;">${res.name}</h3>
                            ${ratingHtml}
                        </div>
                        <span class="restaurant-type" style="font-size:0.82em; color:#6b7280; margin-bottom: 6px;"><i class="fa-solid fa-tags"></i> ${res.type}</span>
                        <p class="restaurant-desc" style="margin: 0 0 8px 0; font-size:0.85em; color:#4b5563; line-height:1.4;">${res.whyRecommend}</p>
                        ${groupMenuHtml}
                        ${cardHtml}
                        ${orderingTipHtml}
                    </div>
                `;
                restaurantsGrid.appendChild(card);
            });
            
            // Add dynamic ones from our lookup to round out choices
            const extraRestaurants = [
                {
                    name: '페르시안궁전 (波斯宮殿咖哩)',
                    distance: '步行 2 分鐘 (成大正門旁)',
                    type: '印度波斯咖哩、烤餅 (素食專區)',
                    desc: '成大正門旁傳奇咖哩。設有獨立 Vegan 純素烹飪空間與專屬素食菜單，烤餅與不辣咖哩也極度適合小孩長輩。',
                    image: 'https://images.unsplash.com/photo-1585938338392-50a59970d8ee?q=80&w=600',
                    isVeg: true,
                    rating: '4.1',
                    orderingCard: '비건 달카레 하나, 버터 난 주세요 (請給一份純素豆子咖哩和奶油烤餅)',
                    groupMenu: {
                        vegetarian: "純素豆子咖哩 (Vegan Dhal ₩11,000) 配全素烤餅 (₩3,000)，在純素專用廚房製作，非常安全。",
                        senior: "黃豆純素咖哩 (₩11,000)，豆泥溫和細緻好入口，配香軟烤餅便於消化。",
                        child: "起司烤餅 (₩4,500) 濃郁香甜拉絲，搭配椰香甜咖哩雞 (₩14,500，完全不辣) 是小孩最愛。",
                        adults: "招牌烤全雞咖哩 (₩34,000，可選辣度 2-5 級)，辣手過癮，搭配冰啤酒。"
                    },
                    orderingTip: "咖哩可自由調整辣度。小孩與長輩請選 0 級或 1 級（不辣/微甜），其他大人推薦 2 級（中辣）。"
                },
                {
                    name: '이삭토스트 서울성대店 (Isaac Toast)',
                    distance: '步行 2 分鐘 (150m)',
                    type: '鐵板熱吐司、咖啡 (早餐/輕食)',
                    desc: '民宿出門巷口轉角即達。現點現做奶油鐵板吐司，甜奶油口味外酥內軟。吃素成員可去肉點純起司蛋吐司。',
                    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=600',
                    isVeg: true,
                    rating: '4.3',
                    orderingCard: '치즈 야채 토스트 주세요 (請給起司蔬菜吐司)',
                    groupMenu: {
                        vegetarian: "起司蔬菜吐司 (₩4,200) - 主動要求去肉去火腿。內含煎蛋、起司與滿滿的高麗菜絲、特調甜醬。",
                        senior: "薯餅起司吐司 (₩4,500) - 質地較軟易咀嚼，搭配熱紅茶或熱美式咖啡。",
                        child: "火腿起司蛋吐司 (₩3,800) - 奶油煎吐司香脆偏甜，起司蛋火腿是 6 歲小孩的絕佳早餐。",
                        adults: "雙重起司薯餅牛肉吐司 (₩5,500) - 大分量雙層起司與厚實牛肉排，口感極佳。"
                    },
                    orderingTip: "現點現做通常需等待 5-10 分鐘。若吃素，必須口頭強調「고기 빼주세요 (請去掉肉類)」。"
                },
                {
                    name: '핏제리아오 (Pizzeria\' O)',
                    distance: '步行 11 分鐘 (800m)',
                    type: '正統窯烤披薩、義大利麵 (不辣)',
                    desc: '大學路得獎的名人窯烤披薩店。雙層洋房十分寬敞，提供 Margherita 奶素披薩與無肉白醬麵，適合帶長輩小孩在優雅氛圍用餐。',
                    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600',
                    isVeg: true,
                    rating: '4.4',
                    orderingCard: '마르게리따 피자 안 맵게 주세요 (瑪格麗特披薩請做不辣)',
                    groupMenu: {
                        vegetarian: "經典瑪格麗特披薩 (Margherita ₩19,900) - 奶素，九層塔與莫札瑞拉起司，無肉且不含蔥蒜。",
                        senior: "松露野菇義大利麵 (₩21,000) - 松露香氣濃郁，麵條可要求煮軟一點便於長輩吞嚥。",
                        child: "起司四重奏披薩 (₩22,000) - 附香甜蜂蜜可以沾著吃，濃濃起司拉絲是孩子最愛。",
                        adults: "星形招牌披薩 (O'Pizza ₩24,000) - 內含新鮮瑞可塔起司與生火腿，層次豐富。"
                    },
                    orderingTip: "長輩若習慣軟麵，點餐時請用韓文交代「파스타 면 부드럽게 해주세요 (麵條請煮軟些)」。"
                }
            ];

            extraRestaurants.forEach(res => {
                const card = document.createElement('div');
                card.className = 'restaurant-card card-glass';
                
                const vegLabel = res.isVeg 
                    ? `<span class="restaurant-badge" style="background-color:#059669"><i class="fa-solid fa-leaf"></i> 鍋邊素友善</span>`
                    : `<span class="restaurant-badge" style="background-color:#ea580c"><i class="fa-solid fa-meat"></i> 葷食/小孩愛</span>`;

                let ratingHtml = res.rating 
                    ? `<span class="restaurant-rating" style="font-weight:bold; color:#f59e0b; font-size:0.9em;"><i class="fa-solid fa-star"></i> ${res.rating}</span>`
                    : '';

                let cardHtml = res.orderingCard 
                    ? `<div class="restaurant-card-word" style="font-size: 0.82em; background: rgba(59,130,246,0.06); padding: 6px 10px; border-radius: 6px; margin-top: 8px; border-left: 3px solid #3b82f6; font-family: monospace; display: flex; justify-content: space-between; align-items: center;"><span><strong>🗣️ 韓文點餐：</strong><code>${res.orderingCard}</code></span></div>`
                    : '';

                let groupMenuHtml = '';
                if (res.groupMenu) {
                    groupMenuHtml = `
                        <div class="restaurant-group-menu" style="margin-top: 10px; font-size: 0.82em; border-top: 1px dashed rgba(0,0,0,0.12); padding-top: 8px; line-height: 1.45;">
                            <div style="font-weight: bold; color: #374151; margin-bottom: 5px;"><i class="fa-solid fa-users"></i> 3大1小家庭點餐推薦：</div>
                            <div style="display: grid; gap: 4px; color: #4b5563;">
                                <div><span style="color:#059669; font-weight:bold;">🥬 素食大人：</span>${res.groupMenu.vegetarian}</div>
                                <div><span style="color:#b45309; font-weight:bold;">👴 隨行長輩：</span>${res.groupMenu.senior}</div>
                                <div><span style="color:#2563eb; font-weight:bold;">👦 6歲小孩：</span>${res.groupMenu.child}</div>
                                <div><span style="color:#111827; font-weight:bold;">👥 其他大人：</span>${res.groupMenu.adults}</div>
                            </div>
                        </div>
                    `;
                }

                let orderingTipHtml = res.orderingTip
                    ? `<div style="font-size: 0.8em; color: #dc2626; margin-top: 6px; font-weight: 500; display: flex; align-items: start; gap: 4px;"><i class="fa-solid fa-circle-info" style="margin-top: 2px;"></i> <span><strong>提示：</strong>${res.orderingTip}</span></div>`
                    : '';

                card.innerHTML = `
                    <div class="restaurant-img" style="background-image: url('${res.image}')">
                        <div class="restaurant-badge-wrap">
                            <span class="restaurant-badge"><i class="fa-solid fa-shoe-prints"></i> ${res.distance}</span>
                            ${vegLabel}
                        </div>
                    </div>
                    <div class="restaurant-info" style="display: flex; flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <h3 style="margin: 0; font-size:1.1em; font-weight:700;">${res.name}</h3>
                            ${ratingHtml}
                        </div>
                        <span class="restaurant-type" style="font-size:0.82em; color:#6b7280; margin-bottom: 6px;"><i class="fa-solid fa-tags"></i> ${res.type}</span>
                        <p class="restaurant-desc" style="margin: 0 0 8px 0; font-size:0.85em; color:#4b5563; line-height:1.4;">${res.desc}</p>
                        ${groupMenuHtml}
                        ${cardHtml}
                        ${orderingTipHtml}
                    </div>
                `;
                restaurantsGrid.appendChild(card);
            });
        }

        // 7. Render Checklists (準備與備辦事項)
        const todoList = document.getElementById('todo-list');
        const shoppingList = document.getElementById('shopping-list');
        
        // Merge mustBring and todo
        const allTodos = [
            ...trip.preparations.mustBring.map(item => ({ text: item, category: 'mustBring' })),
            ...trip.preparations.todo.map(item => ({ text: item, category: 'todo' }))
        ];

        allTodos.forEach((item, index) => {
            const li = document.createElement('li');
            const storageKey = `todo_${trip.tripId}_${index}`;
            const isChecked = localStorage.getItem(storageKey) === 'true';
            
            li.className = `checklist-item ${isChecked ? 'checked' : ''}`;
            li.innerHTML = `
                <label class="checklist-item">
                    <input type="checkbox" data-key="${storageKey}" ${isChecked ? 'checked' : ''}>
                    <span>${item.text}</span>
                </label>
            `;
            
            const checkbox = li.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                const checked = e.target.checked;
                localStorage.setItem(storageKey, checked);
                if (checked) {
                    li.classList.add('checked');
                } else {
                    li.classList.remove('checked');
                }
            });
            
            todoList.appendChild(li);
        });

        // Render Shopping List
        trip.shoppingList.forEach((item, index) => {
            const li = document.createElement('li');
            const storageKey = `shop_${trip.tripId}_${index}`;
            const isChecked = localStorage.getItem(storageKey) === 'true';
            
            li.className = `checklist-item ${isChecked ? 'checked' : ''}`;
            li.innerHTML = `
                <label class="checklist-item">
                    <input type="checkbox" data-key="${storageKey}" ${isChecked ? 'checked' : ''}>
                    <span><strong>[${item.store}]</strong> ${item.item}</span>
                </label>
            `;
            
            const checkbox = li.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                const checked = e.target.checked;
                localStorage.setItem(storageKey, checked);
                if (checked) {
                    li.classList.add('checked');
                } else {
                    li.classList.remove('checked');
                }
            });
            
            shoppingList.appendChild(li);
        });
    }
});
