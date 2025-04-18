<?php
require __DIR__ . '/db.php';

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id = $_GET['id'] ?? null;

function handleError($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit;
}

function getAuthToken() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        return $matches[1];
    }
    
    throw new Exception("Authorization token missing");
}

function authenticate($pdo) {
    $token = getAuthToken();
    
    $stmt = $pdo->prepare("SELECT user_id FROM sessions WHERE session_token = ? AND expires_at > NOW()");
    $stmt->execute([$token]);
    $result = $stmt->fetch();
    
    if (!$result) {
        throw new Exception("Unauthorized");
    }
    
    return $result['user_id'];
}

try {
    switch($method) {
        case 'GET':
            switch($action) {
                case 'articles':
                    if ($id) {
                        // Получение конкретной статьи
                        $stmt = $pdo->prepare("
                            SELECT a.id, a.title, a.content, a.image_url, a.created_at, 
                                   u.username as author_name, u.avatar_url as author_avatar
                            FROM articles a
                            JOIN users u ON a.author_id = u.id
                            WHERE a.id = ?
                        ");
                        $stmt->execute([$id]);
                        $article = $stmt->fetch();
                        
                        if (!$article) handleError("Article not found", 404);
                        
                        echo json_encode($article);
                    } else {
                        // Получение списка статей
                        $stmt = $pdo->query("
                            SELECT a.id, a.title, a.content, a.image_url, a.created_at, 
                                   u.username as author_name, u.avatar_url as author_avatar
                            FROM articles a
                            JOIN users u ON a.author_id = u.id
                            ORDER BY a.created_at DESC
                            LIMIT 50
                        ");
                        echo json_encode($stmt->fetchAll());
                    }
                    break;
                    
                case 'user':
                    // Получение данных пользователя
                    $user_id = authenticate($pdo);
                    
                    $stmt = $pdo->prepare("SELECT id, username, email, avatar_url FROM users WHERE id = ?");
                    $stmt->execute([$user_id]);
                    $user = $stmt->fetch();
                    
                    if (!$user) handleError("User not found", 404);
                    
                    echo json_encode($user);
                    break;
                    
                case 'checkAuth':
                    // Проверка авторизации
                    try {
                        $user_id = authenticate($pdo);
                        echo json_encode(['authenticated' => true]);
                    } catch (Exception $e) {
                        echo json_encode(['authenticated' => false]);
                    }
                    break;
                    
                default:
                    handleError("Invalid action");
            }
            break;
            
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            
            switch($action) {
                case 'register':
                    // Регистрация пользователя
                    if (empty($data['username']) || empty($data['email']) || empty($data['password'])) {
                        handleError("Username, email and password are required");
                    }

                    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                        handleError("Invalid email format");
                    }

                    if (strlen($data['password']) < 8) {
                        handleError("Password must be at least 8 characters");
                    }

                    // Проверка существования email
                    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
                    $stmt->execute([$data['email']]);
                    if ($stmt->fetch()) {
                        handleError("Email already registered");
                    }

                    // Хеширование пароля
                    $hashedPassword = password_hash($data['password'], PASSWORD_BCRYPT);

                    // Создание пользователя
                    $stmt = $pdo->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
                    $stmt->execute([$data['username'], $data['email'], $hashedPassword]);

                    echo json_encode(['success' => true, 'message' => 'Registration successful']);
                    break;
                    
                case 'login':
                    // Вход пользователя
                    if (empty($data['email']) || empty($data['password'])) {
                        handleError("Email and password are required");
                    }

                    // Поиск пользователя
                    $stmt = $pdo->prepare("SELECT id, username, password, avatar_url FROM users WHERE email = ?");
                    $stmt->execute([$data['email']]);
                    $user = $stmt->fetch();

                    if (!$user || !password_verify($data['password'], $user['password'])) {
                        handleError("Invalid credentials");
                    }

                    // Создание токена сессии
                    $token = bin2hex(random_bytes(32));
                    $expires = date('Y-m-d H:i:s', time() + 3600 * 24);

                    $stmt = $pdo->prepare("INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)");
                    $stmt->execute([$user['id'], $token, $expires]);

                    // Возвращаем данные пользователя
                    echo json_encode([
                        'success' => true,
                        'token' => $token,
                        'user' => [
                            'id' => $user['id'],
                            'username' => $user['username'],
                            'avatar_url' => $user['avatar_url']
                        ]
                    ]);
                    break;
                    
                case 'articles':
                    // Добавление статьи
                    $user_id = authenticate($pdo);
                    
                    if (empty($data['title']) || empty($data['content']) || empty($data['image_url'])) {
                        handleError("Title, content and image_url are required");
                    }
                    
                    $stmt = $pdo->prepare("INSERT INTO articles (title, content, image_url, author_id) VALUES (?, ?, ?, ?)");
                    $stmt->execute([$data['title'], $data['content'], $data['image_url'], $user_id]);
                    
                    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
                    break;
                    
                default:
                    handleError("Invalid action");
            }
            break;
            
        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            $user_id = authenticate($pdo);
            
            switch($action) {
                case 'articles':
                    // Обновление статьи
                    if (!$id) handleError("Article ID is required");
                    
                    if (empty($data['title']) || empty($data['content']) || empty($data['image_url'])) {
                        handleError("Title, content and image_url are required");
                    }
                    
                    // Проверяем, что статья принадлежит пользователю
                    $stmt = $pdo->prepare("SELECT author_id FROM articles WHERE id = ?");
                    $stmt->execute([$id]);
                    $article = $stmt->fetch();
                    
                    if (!$article) handleError("Article not found", 404);
                    if ($article['author_id'] != $user_id) handleError("Unauthorized", 403);
                    
                    $stmt = $pdo->prepare("UPDATE articles SET title = ?, content = ?, image_url = ? WHERE id = ?");
                    $stmt->execute([$data['title'], $data['content'], $data['image_url'], $id]);
                    
                    echo json_encode(['success' => true]);
                    break;
                    
                case 'profile':
                    // Обновление профиля
                    $updates = [];
                    $params = [];
                    
                    if (!empty($data['username'])) {
                        $updates[] = "username = ?";
                        $params[] = $data['username'];
                    }
                    
                    if (!empty($data['avatar_url'])) {
                        $updates[] = "avatar_url = ?";
                        $params[] = $data['avatar_url'];
                    }
                    
                    if (!empty($data['new_password'])) {
                        if (empty($data['current_password'])) {
                            handleError("Current password is required to change password");
                        }
                        
                        // Проверка текущего пароля
                        $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
                        $stmt->execute([$user_id]);
                        $user = $stmt->fetch();
                        
                        if (!password_verify($data['current_password'], $user['password'])) {
                            handleError("Current password is incorrect");
                        }
                        
                        $hashed_password = password_hash($data['new_password'], PASSWORD_BCRYPT);
                        $updates[] = "password = ?";
                        $params[] = $hashed_password;
                    }
                    
                    if (empty($updates)) {
                        handleError("No data to update");
                    }
                    
                    $query = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";
                    $params[] = $user_id;
                    
                    $stmt = $pdo->prepare($query);
                    $stmt->execute($params);
                    
                    echo json_encode(['success' => true]);
                    break;
                    
                default:
                    handleError("Invalid action");
            }
            break;
            
        case 'DELETE':
            $user_id = authenticate($pdo);
            
            switch($action) {
                case 'articles':
                    // Удаление статьи
                    if (!$id) handleError("Article ID is required");
                    
                    // Проверяем, что статья принадлежит пользователю
                    $stmt = $pdo->prepare("SELECT author_id FROM articles WHERE id = ?");
                    $stmt->execute([$id]);
                    $article = $stmt->fetch();
                    
                    if (!$article) handleError("Article not found", 404);
                    if ($article['author_id'] != $user_id) handleError("Unauthorized", 403);
                    
                    $stmt = $pdo->prepare("DELETE FROM articles WHERE id = ?");
                    $stmt->execute([$id]);
                    
                    echo json_encode(['success' => true]);
                    break;
                    
                case 'logout':
                    // Выход из системы
                    $token = getAuthToken();
                    
                    $stmt = $pdo->prepare("DELETE FROM sessions WHERE session_token = ?");
                    $stmt->execute([$token]);
                    
                    echo json_encode(['success' => true]);
                    break;
                    
                default:
                    handleError("Invalid action");
            }
            break;
            
        default:
            handleError("Method not allowed", 405);
    }
} catch (PDOException $e) {
    handleError("Database error: " . $e->getMessage(), 500);
} catch (Exception $e) {
    handleError($e->getMessage(), 400);
}
?>