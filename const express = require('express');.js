const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());

// MySQL 연결 설정
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'Pro',
  password: '123456',
  database: 'first'
});

// 회원가입 API
app.post('/signup', async (req, res) => {
  const { id, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const query = 'INSERT INTO users (id, password) VALUES (?, ?)';
  connection.query(query, [id, hashedPassword], (error, results) => {
    if (error) {
      res.status(500).json({ error: 'Failed to create user' });
    } else {
      res.status(201).json({ message: 'User created successfully' });
    }
  });
});

// 로그인 API
app.post('/signin', (req, res) => {
  const { id, password } = req.body;
  const query = 'SELECT * FROM users WHERE id = ?';
  connection.query(query, [id], async (error, results) => {
    if (error) {
      res.status(500).json({ error: 'Failed to fetch user' });
    } else if (results.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
    } else {
      const user = results[0];
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Invalid credentials' });
      } else {
        const accessToken = jwt.sign({ id: user.id }, 'access-secret', { expiresIn: '5m' });
        const refreshToken = jwt.sign({ id: user.id }, 'refresh-secret', { expiresIn: '14d' });
        const updateQuery = 'UPDATE users SET refresh_token = ? WHERE id = ?';
        connection.query(updateQuery, [refreshToken, user.id], (error) => {
          if (error) {
            res.status(500).json({ error: 'Failed to update refresh token' });
          } else {
            res.json({ accessToken, refreshToken });
          }
        });
      }
    }
  });
});

// 토큰 갱신 API
app.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token not provided' });
  }
  const query = 'SELECT * FROM users WHERE refresh_token = ?';
  connection.query(query, [refreshToken], (error, results) => {
    if (error) {
      res.status(500).json({ error: 'Failed to fetch user' });
    } else if (results.length === 0) {
      res.status(403).json({ error: 'Invalid refresh token' });
    } else {
      const user = results[0];
      jwt.verify(refreshToken, 'refresh-secret', (err, decoded) => {
        if (err) {
          return res.status(403).json({ error: 'Invalid refresh token' });
        }
        const accessToken = jwt.sign({ id: user.id }, 'access-secret', { expiresIn: '5m' });
        res.json({ accessToken });
      });
    }
  });
});

// 인증 미들웨어
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access token not provided' });
  }
  jwt.verify(token, 'access-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid access token' });
    }
    req.user = user;
    next();
  });
}

// To-Do 항목 생성
app.post('/todos', (req, res) => {
  const { title, content } = req.body;
  const query = 'INSERT INTO todos (title, content) VALUES (?, ?)';
  connection.query(query, [title, content], (error, results) => {
    if (error) {
      res.status(500).json({ error: 'Failed to create a to-do item' });
    } else {
      res.status(201).json({ message: 'To-do item created successfully' });
    }
  });
});

// To-Do 항목 읽기
app.get('/todos/:id', (req, res) => {
  const todoId = req.params.id;
  const query = 'SELECT * FROM todos WHERE id = ?';
  connection.query(query, [todoId], (error, results) => {
    if (error) {
      res.status(500).json({ error: 'Failed to fetch the to-do item' });
    } else if (results.length === 0) {
      res.status(404).json({ error: 'To-do item not found' });
    } else {
      res.status(200).json(results[0]);
    }
  });
});

// To-Do 항목 업데이트
app.put('/todos/:id', (req, res) => {
  const todoId = req.params.id;
  const { title, content, completed } = req.body;
  const query = 'UPDATE todos SET title = ?, content = ?, completed = ? WHERE id = ?';
  connection.query(query, [title, content, completed, todoId], (error, results) => {
    if (error) {
      res.status(500).json({ error: 'Failed to update the to-do item' });
    } else if (results.affectedRows === 0) {
      res.status(404).json({ error: 'To-do item not found' });
    } else {
      res.status(200).json({ message: 'To-do item updated successfully' });
    }
  });
});

// To-Do 항목 삭제
app.delete('/todos/:id', (req, res) => {
  const todoId = req.params.id;
  const query = 'DELETE FROM todos WHERE id = ?';
  connection.query(query, [todoId], (error, results) => {
    if (error) {
      res.status(500).json({ error: 'Failed to delete the to-do item' });
    } else if (results.affectedRows === 0) {
      res.status(404).json({ error: 'To-do item not found' });
    } else {
      res.status(200).json({ message: 'To-do item deleted successfully' });
    }
  });
});

// 서버 실행
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});


// todo-service.test.js
const TodoService = require('./todo-service');
const TodoModel = require('./todo-model');

jest.mock('./todo-model');

describe('TodoService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return all todos', async () => {
    const mockTodos = [
      { id: 1, title: 'Todo 1', completed: false },
      { id: 2, title: 'Todo 2', completed: true },
    ];
    TodoModel.find.mockResolvedValue(mockTodos);

    const todos = await TodoService.get();

    expect(todos).toEqual(mockTodos);
    expect(TodoModel.find).toHaveBeenCalledTimes(1);
  });
});

// app.test.js
const request = require('supertest');
const app = require('./app');

describe('GET /todo', () => {
  it('should return all todos', async () => {
    const response = await request(app).get('/todo');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: 1, title: 'Todo 1', completed: false },
      { id: 2, title: 'Todo 2', completed: true },
    ]);
  });
});

// todo-service.test.js
describe('TodoService', () => {
  // ...

  it('should create a new todo', async () => {
    const mockTodo = { title: 'New Todo', completed: false };
    TodoModel.create.mockResolvedValue(mockTodo);

    const createdTodo = await TodoService.create(mockTodo);

    expect(createdTodo).toEqual(mockTodo);
    expect(TodoModel.create).toHaveBeenCalledWith(mockTodo);
  });

  // Similarly, write unit tests for update and delete functions
});

// app.test.js
describe('POST /todo', () => {
  it('should create a new todo', async () => {
    const newTodo = { title: 'New Todo', completed: false };
    const response = await request(app).post('/todo').send(newTodo);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(newTodo);
  });
});

// Similarly, write integration tests for PUT and DELETE endpoints
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json()); 
