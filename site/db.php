<?php
    $host= '127.0.0.1';
    $port = '3308';
    $db = 'site';
    $login = 'root';
    $password = 'root';

    $dsn = "mysql:host=$host;dbname=$db;port=$port;charset=utf8mb4";

    $options =
    [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    try
    {
        $pdo = new PDO($dsn, $login, $password, $options);
    }
    catch (\PDOException $e)
    {
        throw new \PDOException($e->getMessage(), (int)$e->getCode());
    }
?>