// ---------------------------
// ПОДКЛЮЧЕНИЕ SUPABASE
// ---------------------------
const supabaseUrl = 'https://ylmzdnpvydiqojskoinl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsbXpkbnB2eWRpcW9qc2tvaW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODU2ODksImV4cCI6MjA4MDM2MTY4OX0.CCXQPhG2LtDUL-gn11am9UUtd15HsA2CHBVAwZY4x9s';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ---------------------------
// ПЕРЕМЕННЫЕ ИГРОКА
// ---------------------------
let player = {
    id: null,
    nickname: prompt("Введите ник:"),
    skin: "square", // "square", "circle", "triangle"
    color: "#" + Math.floor(Math.random()*16777215).toString(16), // случайный цвет
    x: 100,
    y: 100,
    direction: 0,
    alive: true
};

let otherPlayers = {};
let lastMessage = "";

// ---------------------------
// РЕГИСТРАЦИЯ В БАЗЕ
// ---------------------------
async function registerPlayer() {
    const { data, error } = await supabase
        .from("players")
        .insert([player])
        .select();
    if (data && data[0]) player.id = data[0].id;
}

registerPlayer();

// ---------------------------
// ОБНОВЛЕНИЕ ПОЗИЦИИ
// ---------------------------
async function updatePlayerPosition() {
    if (!player.id) return;
    await supabase
        .from("players")
        .update({
            x: player.x,
            y: player.y,
            direction: player.direction,
            alive: player.alive
        })
        .eq("id", player.id);
}

setInterval(updatePlayerPosition, 100);

// ---------------------------
// ПОЛУЧЕНИЕ ДРУГИХ ИГРОКОВ
// ---------------------------
supabase
    .channel('players')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, payload => {
        const p = payload.new;
        if(p.id !== player.id) {
            otherPlayers[p.id] = p;
        }
    })
    .subscribe();

// ---------------------------
// ЧАТ
// ---------------------------
async function sendMessage(text) {
    if (!text || text === lastMessage) return; // анти-повтор
    lastMessage = text;
    await supabase
        .from("chat")
        .insert([{ nickname: player.nickname, message: text }]);
}

const chatInput = document.getElementById("chatInput");
chatInput.addEventListener("keydown", e => {
    if(e.key === "Enter") {
        sendMessage(chatInput.value);
        chatInput.value = "";
    }
});

supabase
    .channel('chat')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat' }, payload => {
        const msg = payload.new;
        const chatDiv = document.getElementById("chat");
        chatDiv.innerHTML += `<div><b>${msg.nickname}:</b> ${msg.message}</div>`;
        chatDiv.scrollTop = chatDiv.scrollHeight;
    })
    .subscribe();

// ---------------------------
// CANVAS
// ---------------------------
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ---------------------------
// ОТРИСОВКА ИГРОКОВ
// ---------------------------
function drawPlayers() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // текущий игрок
    ctx.fillStyle = player.color;
    if(player.skin === "square") ctx.fillRect(player.x, player.y, 30, 30);
    if(player.skin === "circle") {
        ctx.beginPath();
        ctx.arc(player.x+15, player.y+15, 15, 0, Math.PI*2);
        ctx.fill();
    }
    if(player.skin === "triangle") {
        ctx.beginPath();
        ctx.moveTo(player.x+15, player.y);
        ctx.lineTo(player.x, player.y+30);
        ctx.lineTo(player.x+30, player.y+30);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText(player.nickname, player.x, player.y - 5);

    // другие игроки
    for(let id in otherPlayers){
        const p = otherPlayers[id];
        ctx.fillStyle = p.color;
        if(p.skin === "square") ctx.fillRect(p.x, p.y, 30, 30);
        if(p.skin === "circle") {
            ctx.beginPath();
            ctx.arc(p.x+15, p.y+15, 15, 0, Math.PI*2);
            ctx.fill();
        }
        if(p.skin === "triangle") {
            ctx.beginPath();
            ctx.moveTo(p.x+15, p.y);
            ctx.lineTo(p.x, p.y+30);
            ctx.lineTo(p.x+30, p.y+30);
            ctx.closePath();
            ctx.fill();
        }
        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.fillText(p.nickname, p.x, p.y - 5);
    }
}

setInterval(drawPlayers, 50);

// ---------------------------
// ПРОСТОЕ УПРАВЛЕНИЕ (клавиши WASD)
// ---------------------------
document.addEventListener("keydown", e => {
    if(e.key === "w") player.y -= 5;
    if(e.key === "s") player.y += 5;
    if(e.key === "a") player.x -= 5;
    if(e.key === "d") player.x += 5;
});
