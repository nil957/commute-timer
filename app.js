// 默认路段配置
const defaultSegments = [
    { icon: '🚶', type: 'walk', name: '家 → 地铁站', desc: '出门到进站', time: 8 },
    { icon: '⏳', type: 'wait', name: '等地铁', desc: '站台等车', time: 3 },
    { icon: '🚇', type: 'metro', name: '地铁', desc: '乘车时间', time: 25 },
    { icon: '🚶', type: 'walk', name: '地铁站 → 公司', desc: '出站到公司楼下', time: 5 },
    { icon: '🚦', type: 'light', name: '等红绿灯', desc: '路口平均等待', time: 1 },
    { icon: '🛗', type: 'wait', name: '等电梯 + 上楼', desc: '到工位', time: 3 },
];

let segments = [];
let trafficLightConfig = {
    redDuration: 60,
    greenDuration: 30,
    lastGreenTime: null
};

// 地铁选择状态
let selectedLine = '';
let selectedStart = '';
let selectedEnd = '';
let calculatedMetroTime = 0;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initMetroSelector();
    loadConfig();
});

// 初始化地铁选择器
function initMetroSelector() {
    const lineSelect = document.getElementById('metroLine');
    Object.keys(metroLines).forEach(key => {
        const line = metroLines[key];
        const option = document.createElement('option');
        option.value = key;
        option.textContent = line.name;
        lineSelect.appendChild(option);
    });
}

// 线路改变事件
function onLineChange() {
    const lineSelect = document.getElementById('metroLine');
    selectedLine = lineSelect.value;
    
    const startSelect = document.getElementById('metroStart');
    const endSelect = document.getElementById('metroEnd');
    
    // 清空站点选择
    startSelect.innerHTML = '<option value="">起点站</option>';
    endSelect.innerHTML = '<option value="">终点站</option>';
    document.getElementById('metroInfo').style.display = 'none';
    document.getElementById('metroApplyBtn').disabled = true;
    
    if (selectedLine) {
        const line = metroLines[selectedLine];
        line.stations.forEach((station, index) => {
            const optStart = document.createElement('option');
            optStart.value = index;
            optStart.textContent = station;
            startSelect.appendChild(optStart);
            
            const optEnd = document.createElement('option');
            optEnd.value = index;
            optEnd.textContent = station;
            endSelect.appendChild(optEnd);
        });
    }
}

// 站点改变事件
function onStationChange() {
    const startSelect = document.getElementById('metroStart');
    const endSelect = document.getElementById('metroEnd');
    
    selectedStart = startSelect.value;
    selectedEnd = endSelect.value;
    
    if (selectedLine && selectedStart !== '' && selectedEnd !== '' && selectedStart !== selectedEnd) {
        calculateMetroTime();
    } else {
        document.getElementById('metroInfo').style.display = 'none';
        document.getElementById('metroApplyBtn').disabled = true;
    }
}

// 计算地铁时间
function calculateMetroTime() {
    const line = metroLines[selectedLine];
    const startIdx = parseInt(selectedStart);
    const endIdx = parseInt(selectedEnd);
    
    const stationCount = Math.abs(endIdx - startIdx);
    const estimatedMinutes = Math.round(stationCount * line.avgTime);
    
    calculatedMetroTime = estimatedMinutes;
    
    // 显示信息
    document.getElementById('stationCount').textContent = `${stationCount} 站`;
    document.getElementById('estimatedTime').textContent = `${estimatedMinutes} 分钟`;
    
    const scheduleInfo = document.getElementById('scheduleInfo');
    scheduleInfo.innerHTML = `
        <span>🚇 ${line.name}</span>
        <span>📍 ${line.stations[startIdx]} → ${line.stations[endIdx]}</span>
        <span>⏰ 首班车：${line.firstTrain} | 末班车：${line.lastTrain}</span>
    `;
    
    document.getElementById('metroInfo').style.display = 'block';
    document.getElementById('metroApplyBtn').disabled = false;
}

// 交换起终点
function swapStations() {
    const startSelect = document.getElementById('metroStart');
    const endSelect = document.getElementById('metroEnd');
    
    const temp = startSelect.value;
    startSelect.value = endSelect.value;
    endSelect.value = temp;
    
    onStationChange();
}

// 应用地铁时间
function applyMetroTime() {
    if (calculatedMetroTime > 0) {
        const line = metroLines[selectedLine];
        const startIdx = parseInt(selectedStart);
        const endIdx = parseInt(selectedEnd);
        
        // 查找是否已有地铁路段
        let metroSegmentIndex = segments.findIndex(s => s.type === 'metro');
        
        if (metroSegmentIndex >= 0) {
            // 更新现有地铁路段
            segments[metroSegmentIndex].time = calculatedMetroTime;
            segments[metroSegmentIndex].name = `${line.name} 地铁`;
            segments[metroSegmentIndex].desc = `${line.stations[startIdx]} → ${line.stations[endIdx]}`;
        } else {
            // 添加新的地铁路段
            segments.push({
                icon: '🚇',
                type: 'metro',
                name: `${line.name} 地铁`,
                desc: `${line.stations[startIdx]} → ${line.stations[endIdx]}`,
                time: calculatedMetroTime
            });
        }
        
        renderSegments();
        saveConfig();
        
        // 提示
        alert(`已将 ${calculatedMetroTime} 分钟的地铁时间填入路段配置！`);
    }
}

// 加载配置
function loadConfig() {
    const saved = localStorage.getItem('commuteConfig');
    if (saved) {
        const config = JSON.parse(saved);
        segments = config.segments || defaultSegments;
        trafficLightConfig = config.trafficLight || trafficLightConfig;
        document.getElementById('targetTime').value = config.targetTime || '09:00';
        document.getElementById('redDuration').value = trafficLightConfig.redDuration;
        document.getElementById('greenDuration').value = trafficLightConfig.greenDuration;
        if (trafficLightConfig.lastGreenTime) {
            document.getElementById('lastGreenTime').value = trafficLightConfig.lastGreenTime;
        }
    } else {
        segments = [...defaultSegments];
    }
    renderSegments();
}

// 保存配置
function saveConfig() {
    trafficLightConfig.redDuration = parseInt(document.getElementById('redDuration').value) || 60;
    trafficLightConfig.greenDuration = parseInt(document.getElementById('greenDuration').value) || 30;
    trafficLightConfig.lastGreenTime = document.getElementById('lastGreenTime').value || null;
    
    const config = {
        segments,
        trafficLight: trafficLightConfig,
        targetTime: document.getElementById('targetTime').value
    };
    localStorage.setItem('commuteConfig', JSON.stringify(config));
    calculate();
}

// 渲染路段
function renderSegments() {
    const container = document.getElementById('segments');
    container.innerHTML = segments.map((seg, i) => `
        <div class="segment">
            <div class="segment-icon ${seg.type}">${seg.icon}</div>
            <div class="segment-info">
                <div class="segment-name">${seg.name}</div>
                <div class="segment-desc">${seg.desc}</div>
            </div>
            <div class="segment-time">
                <input type="number" value="${seg.time}" min="0" 
                       onchange="updateSegment(${i}, this.value)">
                <span>分钟</span>
            </div>
            <button class="delete-btn" onclick="deleteSegment(${i})">×</button>
        </div>
    `).join('');
    calculate();
}

// 更新路段时间
function updateSegment(index, value) {
    segments[index].time = parseInt(value) || 0;
    saveConfig();
}

// 删除路段
function deleteSegment(index) {
    segments.splice(index, 1);
    renderSegments();
    saveConfig();
}

// 添加路段
function addSegment() {
    const types = [
        { icon: '🚶', type: 'walk', name: '步行', desc: '步行路段' },
        { icon: '🚇', type: 'metro', name: '地铁', desc: '乘车时间' },
        { icon: '⏳', type: 'wait', name: '等待', desc: '等待时间' },
        { icon: '🚦', type: 'light', name: '红绿灯', desc: '路口等待' },
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    segments.push({ ...type, time: 5 });
    renderSegments();
    saveConfig();
}

// 计算出门时间
function calculate() {
    const targetTime = document.getElementById('targetTime').value;
    if (!targetTime) return;
    
    const totalMinutes = segments.reduce((sum, seg) => sum + (seg.time || 0), 0);
    document.getElementById('totalTime').textContent = `${totalMinutes} 分钟`;
    
    const [hours, minutes] = targetTime.split(':').map(Number);
    const targetDate = new Date();
    targetDate.setHours(hours, minutes, 0, 0);
    
    const leaveDate = new Date(targetDate.getTime() - totalMinutes * 60 * 1000);
    
    const leaveTimeStr = leaveDate.toTimeString().slice(0, 5);
    document.getElementById('leaveTime').textContent = leaveTimeStr;
    document.getElementById('resultDetail').textContent = 
        `总通勤 ${totalMinutes} 分钟，预计 ${targetTime} 到达`;
    
    updateCountdown(leaveDate);
}

// 更新倒计时
function updateCountdown(leaveDate) {
    const now = new Date();
    const diff = leaveDate.getTime() - now.getTime();
    
    const countdownEl = document.getElementById('countdown');
    
    if (diff <= 0) {
        countdownEl.textContent = '该出门了！';
        countdownEl.className = 'countdown-time urgent';
    } else {
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        
        countdownEl.textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (diff < 300000) { // 5分钟内
            countdownEl.className = 'countdown-time urgent';
        } else {
            countdownEl.className = 'countdown-time ok';
        }
    }
}

// 更新红绿灯状态
function updateTrafficLight() {
    const lastGreen = document.getElementById('lastGreenTime').value;
    if (!lastGreen) {
        document.getElementById('lightText').textContent = '等待校准...';
        document.getElementById('redLight').classList.remove('active');
        document.getElementById('greenLight').classList.remove('active');
        return;
    }
    
    const redDuration = trafficLightConfig.redDuration;
    const greenDuration = trafficLightConfig.greenDuration;
    const cycleDuration = redDuration + greenDuration;
    
    const [h, m, s] = lastGreen.split(':').map(Number);
    const lastGreenDate = new Date();
    lastGreenDate.setHours(h, m, s || 0, 0);
    
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - lastGreenDate.getTime()) / 1000);
    const cyclePosition = ((elapsed % cycleDuration) + cycleDuration) % cycleDuration;
    
    const redLight = document.getElementById('redLight');
    const greenLight = document.getElementById('greenLight');
    const lightText = document.getElementById('lightText');
    
    if (cyclePosition < greenDuration) {
        // 绿灯
        redLight.classList.remove('active');
        greenLight.classList.add('active');
        const remaining = greenDuration - cyclePosition;
        lightText.textContent = `🟢 绿灯 ${remaining}秒`;
    } else {
        // 红灯
        redLight.classList.add('active');
        greenLight.classList.remove('active');
        const remaining = cycleDuration - cyclePosition;
        lightText.textContent = `🔴 红灯 ${remaining}秒`;
    }
}

// 每秒更新
setInterval(() => {
    const targetTime = document.getElementById('targetTime').value;
    if (targetTime) {
        const totalMinutes = segments.reduce((sum, seg) => sum + (seg.time || 0), 0);
        const [hours, minutes] = targetTime.split(':').map(Number);
        const targetDate = new Date();
        targetDate.setHours(hours, minutes, 0, 0);
        const leaveDate = new Date(targetDate.getTime() - totalMinutes * 60 * 1000);
        updateCountdown(leaveDate);
    }
    updateTrafficLight();
}, 1000);

// 目标时间变化时重新计算
document.getElementById('targetTime').addEventListener('change', calculate);
