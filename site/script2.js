document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    
    loadArticles();
    loadUserData();
    
    const articleModal = document.getElementById('articleModal');
    const profileModal = document.getElementById('profileModal');
    //const addArticleBtn = document.getElementById('addArticleBtn');
    const profileAvatar = document.getElementById('profileAvatar');
    const logoutBtn = document.getElementById('logoutBtn');
    const closeButtons = document.querySelectorAll('.close');
    
    //addArticleBtn.addEventListener('click', () => articleModal.style.display = 'block');
    profileAvatar.addEventListener('click', () => profileModal.style.display = 'block');
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal-window').style.display = 'none';
        });
    });
    
    // Закрытие при клике вне модального окна
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal-window')) {
            event.target.style.display = 'none';
        }
    });

    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            profileModal.style.display = 'block';
            loadUserData(); // Загружаем актуальные данные при открытии
        });
    }
    
    logoutBtn.addEventListener('click', function() {
        const token = localStorage.getItem('authToken');
        
        fetch('/site/site.php?action=logout', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .finally(() => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            window.location.href = 'index.html';
        });
    });

    
    
    document.querySelector('#articleModal .modal-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const title = document.getElementById('articleTitle').value;
        const content = document.getElementById('articleText').value;
        const image_url = document.getElementById('articleImage').value;
        
        const token = localStorage.getItem('authToken');
        
        fetch('/site/site.php?action=articles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, content, image_url })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })
        .then(data => {
            alert('Статья успешно опубликованна!');
            articleModal.style.display = 'none';
            document.getElementById('articleModal .modal-form').reset();
            loadArticles();
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.error || 'Ошибка публикации статьи.');
        });
    });
    
    document.querySelector('#profileModal .modal-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('profileName').value;
        const avatar_url = document.getElementById('profileImage').value;
        const current_password = document.getElementById('currentPassword').value;
        const new_password = document.getElementById('newPassword').value;
        const confirm_password = document.getElementById('confirmPassword').value;
        
        if (new_password && new_password !== confirm_password) {
            alert('Новые пароли не совпадают!');
            return;
        }
        
        const token = localStorage.getItem('authToken');
        const data = {
            username,
            avatar_url,
            current_password,
            new_password
        };
        
        fetch('/site/site.php?action=profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })
        .then(data => {
            const userData = JSON.parse(localStorage.getItem('userData'));
            userData.username = username;
            userData.avatar_url = avatar_url;
            localStorage.setItem('userData', JSON.stringify(userData));
            
            document.querySelector('.profile-name').textContent = username;
            if (avatar_url) {
                document.querySelector('.profile-avatar').src = avatar_url;
                document.getElementById('profileAvatar').src = avatar_url;
            }
            
            alert('Профиль успешно обновлен!');
            profileModal.style.display = 'none';
            document.getElementById('profileModal .modal-form').reset();
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.error || 'Ошибка обновления профиля.');
        });
    });
});

function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    
    fetch('/site/site.php?action=checkAuth', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Not authenticated');
        }
        return response.json();
    })
    .then(data => {
        if (!data.authenticated) {
            throw new Error('Not authenticated');
        }
    })
    .catch(() => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = 'index.html';
    });
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
                container.innerHTML = '<p class="no-articles">Статьи не найдены. Будьте первым!</p>';
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
                
                articleCard.addEventListener('click', () => {
                    window.location.href = `article.html?id=${article.id}`;
                });
                
                container.appendChild(articleCard);
            });
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('articlesContainer').innerHTML = `
                <p class="error-message">Ошибка загрузки статей. Попробуйте позже.</p>
            `;
        });
}

function loadUserData() {
    const token = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('userData'));
    
    if (!userData) {
        fetch('/site/site.php?action=user', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load user data');
            }
            return response.json();
        })
        .then(data => {
            localStorage.setItem('userData', JSON.stringify(data));
            updateUserUI(data);
        })
        .catch(error => {
            console.error('Error:', error);
        });
    } else {
        updateUserUI(userData);
        
        fetch('/site/site.php?action=user', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load user data');
            }
            return response.json();
        })
        .then(data => {
            localStorage.setItem('userData', JSON.stringify(data));
            if (data.avatar_url !== userData.avatar_url || data.username !== userData.username) {
                updateUserUI(data);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }
}

function updateUserUI(userData) {
    document.querySelector('.profile-name').textContent = userData.username;
    const avatarUrl = userData.avatar_url || 'images/default-avatar.jpeg';
    document.querySelector('.profile-avatar').src = avatarUrl;
    document.getElementById('profileAvatar').src = avatarUrl;

    document.getElementById('profileName').value = userData.username;
    document.getElementById('profileImage').value = userData.avatar_url || '';
}