const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// MySQL 연결 설정
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'Pro',
  password: '123456',
  database: 'first'
});

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
