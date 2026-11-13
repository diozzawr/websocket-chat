const API_URL = 'https://inai-col3.fishrungames.com/api'; // Проверьте точный путь по вашему Swagger для авторизации
const WS_URL = 'wss://inai-col3.fishrungames.com/chat/';

let isLoginMode = true;
let socket = null;

// Элементы DOM
const authSection = document.getElementById('auth-section');
const chatSection = document.getElementById('chat-section');
const authForm = document.getElementById('auth-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const authError = document.getElementById('auth-error');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const submitBtn = document.getElementById('submit-btn');

const currentUserSpan = document.getElementById('current-user');
const logoutBtn = document.getElementById('logout-btn');
const messagesContainer = document.getElementById('messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');

// Переключение табов Вход / Регистрация
tabLogin.addEventListener('click', () => {
    isLoginMode = true;
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    submitBtn.textContent = 'Войти';
    authError.textContent = '';
});

tabRegister.addEventListener('click', () => {
    isLoginMode = false;
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    submitBtn.textContent = 'Зарегистрироваться';
    authError.textContent = '';
});

// Обработка отправки формы входа/регистрации
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    // Эндпоинты регистрации и логина уточните по вашему Swagger (например, /auth/login/ и /auth/register/)
    const endpoint = isLoginMode ? `${API_URL}/auth/login/` : `${API_URL}/auth/register/`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || data.message || 'Ошибка авторизации');
        }

        if (isLoginMode) {
            // Сохраняем access токен (в зависимости от бэкенда это data.access или data.token)
            const accessToken = data.access || data.token;
            localStorage.setItem('access_token', accessToken);
            localStorage.setItem('username', username);
            
            startChat(accessToken, username);
        } else {
            // После успешной регистрации сразу переключаем на вход или логиним
            alert('Регистрация успешна! Теперь войдите.');
            tabLogin.click();
        }
    } catch (err) {
        authError.textContent = err.message;
    }
});

// Функция запуска WebSocket чата
function startChat(token, username) {
    authSection.classList.add('hidden');
    chatSection.classList.remove('hidden');
    currentUserSpan.textContent = username;

    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        console.log('WebSocket соединение установлено. Отправка AUTH...');
        // Шаг из задания: первое сообщение — AUTH с токеном
        const authMessage = {
            type: "AUTH",
            payload: { token: token }
        };
        socket.send(JSON.stringify(authMessage));
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('Получено сообщение:', message);

        if (message.type === 'AUTH_SUCCESS') {
            appendSystemMessage(`Успешно авторизован как ${message.payload.username}`);
        } else if (message.type === 'NEW_MESSAGE') {
            renderMessage(message.payload.sender, message.payload.text, message.payload.timestamp);
        }
    };

    socket.onerror = (error) => {
        console.error('WebSocket ошибка:', error);
    };

    socket.onclose = () => {
        appendSystemMessage('Соединение с чатом закрыто.');
    };
}

// Отправка сообщения в чат
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !socket) return;

    const chatMessage = {
        type: "CHAT_MESSAGE",
        payload: { text: text }
    };

    socket.send(JSON.stringify(chatMessage));
    messageInput.value = '';
});

// Выход из аккаунта (Logout)
logoutBtn.addEventListener('click', () => {
    if (socket) {
        socket.close();
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
    chatSection.classList.add('hidden');
    authSection.classList.remove('hidden');
    messagesContainer.innerHTML = '';
    usernameInput.value = '';
    passwordInput.value = '';
});

// Проверка при загрузке страницы: если токен уже есть, можно попробовать подключиться
window.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem('access_token');
    const savedUsername = localStorage.getItem('username');
    if (savedToken && savedUsername) {
        startChat(savedToken, savedUsername);
    }
});

function renderMessage(sender, text, timestamp) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-D', minute: '2-digit' }) : '';
    
    msgDiv.innerHTML = `<strong>${sender}</strong>: ${text} <span class="time">${timeStr}</span>`;
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function appendSystemMessage(text) {
    const sysDiv = document.createElement('div');
    sysDiv.classList.add('system-message');
    sysDiv.textContent = text;
    messagesContainer.appendChild(sysDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}