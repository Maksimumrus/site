document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    
    loadArticles();
    
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const closeButtons = document.querySelectorAll('.close');
    
    loginBtn.addEventListener('click', () => loginModal.style.display = 'block');
    registerBtn.addEventListener('click', () => registerModal.style.display = 'block');
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal-window').style.display = 'none';
        });
    });
    
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal-window')) {
            event.target.style.display = 'none';
        }
    });
    
    document.querySelector('#loginModal .modal-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        fetch('/site/site.php?action=login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })
        .then(data => {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            window.location.href = 'indexLoginned.html';
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.error || 'Ошибка входа. Попробуйте позже.');
        });
    });
    
    document.querySelector('#registerModal .modal-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirm = document.getElementById('registerConfirm').value;
        
        if (password !== confirm) {
            alert('Пароли не совападают!');
            return;
        }
        
        fetch('/site/site.php?action=register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })
        .then(data => {
            alert('Успешная регистрация! Теперь вы можете выполнить вход.');
            registerModal.style.display = 'none';
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.error || 'Ошибка регистрации. Попробуйте позже.');
        });
    });
});

function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    if (token) {
        fetch('/site/site.php?action=checkAuth', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.authenticated) {
                window.location.href = 'indexLoginned.html';
            }
        })
        .catch(() => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
        });
    }
}

function loadArticles() {
    fetch('/site/site.php?action=articles')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load articles');
            }
            return response.json();
        })
        .then(articles => {
            const container = document.getElementById('articlesContainer');
            container.innerHTML = '';
            
            if (!articles || articles.length === 0) {
                container.innerHTML = '<p class="no-articles">No articles found</p>';
                return;
            }
            
            articles.forEach(article => {
                const articleCard = document.createElement('div');
                articleCard.className = 'article-card';
                
                articleCard.innerHTML = `
                    <div class="article-content">
                        <img alt="Article Image" class="article-image" src="${article.image_url}" loading="lazy">
                        <div class="article-details">
                            <h2 class="article-title">${article.title}</h2>
                            <div class="author-info">
                                <img alt="Author Image" class="author-avatar" src="${article.author_avatar || 'images/default-avatar.jpg'}">
                                <span class="author-name">${article.author_name}</span>
                                <span class="article-date">${new Date(article.created_at).toLocaleDateString()}</span>
                            </div>
                            <p class="article-excerpt">${article.content.substring(0, 150)}...</p>
                        </div>
                    </div>
                `;
                
                // Добавляем обработчик клика для просмотра полной статьи
                articleCard.addEventListener('click', () => {
                    window.location.href = `article.html?id=${article.id}`;
                });
                
                container.appendChild(articleCard);
            });
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('articlesContainer').innerHTML = `
                <p class="error-message">Ошибка загрузки статей. Попробуйте позже</p>
            `;
        });
}