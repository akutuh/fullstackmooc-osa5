const mongoose = require('mongoose')
const supertest = require('supertest')
const bcrypt = require('bcrypt')
const helper = require('./test_helper')
const app = require('../app')

const api = supertest(app)

const Blog = require('../models/blog')
const User = require('../models/user')

describe('add blogs test', () => {
  beforeEach(async () => {
    await Blog.deleteMany({})
    await Blog.insertMany(helper.initialNotes)

    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'root', passwordHash })

    await user.save()
  })

  test('right ammount of blogs returned', async () => {
    const response = await api.get('/api/blogs')

    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body).toHaveLength(6)
  })

  test('blog identifier is id', async () => {
    const response = await api.get('/api/blogs')
    const contents = response._body
    contents.forEach(blog => {
      //expect(blog).toHaveProperty('id')
      expect(blog['id']).toBeDefined()

    })
  })
  test('blog can be added', async () => {

    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'testuser', passwordHash })

    await user.save()

    const userThings = {
      username: user.username,
      password: 'sekret'
    }

    const result = await api
      .post('/api/login')
      .send(userThings)
      .expect(200)

    const newBlog = {
      title: 'Dog blog',
      author: 'Pekka Järvi',
      url: 'http//blog.dogblog1000.com',
      likes: 2
    }

    await api
      .post('/api/blogs')
      .send(newBlog)
      .set('Authorization', `Bearer ${result._body.token}`)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const response = await api.get('/api/blogs')

    const titles = response.body.map(r => r.title)

    expect(response.body).toHaveLength(helper.initialNotes.length + 1)
    expect(titles).toContain(
      'Dog blog'
    )
  })

  test('if likes has no value it is assigned to 0', async () => {

    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'testuser1', passwordHash })

    await user.save()

    const userThings = {
      username: user.username,
      password: 'sekret'
    }

    const result = await api
      .post('/api/login')
      .send(userThings)
      .expect(200)

    const newBlog = {
      title: 'Dog blog',
      author: 'Pekka Järvi',
      url: 'http//blog.dogblog1000.com',
      likes: undefined
    }

    await api
      .post('/api/blogs')
      .send(newBlog)
      .set('Authorization', `Bearer ${result._body.token}`)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const response = await api.get('/api/blogs')
    const contents = response._body

    expect(response.body).toHaveLength(helper.initialNotes.length + 1)
    contents.forEach(blog => {
      expect(blog.likes).toBeDefined()
    }

    )
  })

  test('if title and url is missing return status 400', async () => {

    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'testuser2', passwordHash })

    await user.save()

    const userThings = {
      username: user.username,
      password: 'sekret'
    }

    const result = await api
      .post('/api/login')
      .send(userThings)
      .expect(200)

    const newBlog = {
      author: 'Jukka Pekka',
      likes: 2
    }

    await api
      .post('/api/blogs')
      .send(newBlog)
      .set('Authorization', `Bearer ${result._body.token}`)
      .expect(400)
  })

  test('delete blog', async () => {

    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'testuser3', passwordHash })

    await user.save()

    const userThings = {
      username: user.username,
      password: 'sekret'
    }

    const result = await api
      .post('/api/login')
      .send(userThings)
      .expect(200)

    const newBlog = {
      title: 'Space blog',
      author: 'Jaska Jokinen',
      url: 'http//blog.spaceblog.com',
      likes: 45
    }

    const blogAddedResult = await api
      .post('/api/blogs')
      .send(newBlog)
      .set('Authorization', `Bearer ${result._body.token}`)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const blogsAtStart = await helper.blogsInDb()
    const blogToDelete = blogsAtStart.find(blog => blog.id === blogAddedResult._body.id)

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set('Authorization', `Bearer ${result._body.token}`)
      .expect(200)

    const blogsAtEnd = await helper.blogsInDb()

    expect(blogsAtEnd).toHaveLength(
      helper.initialNotes.length
    )

    const titles = blogsAtEnd.map(t => t.title)

    expect(titles).not.toContain(blogToDelete.title)
  })

  test('update likes on specific blog', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToUpdate = blogsAtStart[0]

    await api
      .put(`/api/blogs/${blogToUpdate.id}`)
      .send({ likes: 8 })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()
    const updatedBlogAtEnd = blogsAtEnd[0]

    expect(updatedBlogAtEnd.likes).toBe(8)

  })

  test('cant add new blog when token is missing and returns 401', async () => {

    const newBlog = {
      title: 'Bike blog',
      author: 'Jorma Metsä',
      url: 'http//blog.bikes.com',
      likes: 2
    }

    const result = await api
      .post('/api/blogs')
      .send(newBlog)
      .set('Authorization', 'Bearer ')
      .expect(401)
      .expect('Content-Type', /application\/json/)

    console.log(result.status)
    const response = await api.get('/api/blogs')

    const titles = response.body.map(r => r.title)

    expect(response.body).toHaveLength(helper.initialNotes.length)
    expect(titles).not.toContain(
      'Bike blog'
    )
  })
})



describe('user test', () => {
  beforeEach(async () => {
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'root', passwordHash })

    await user.save()
  })

  test('creation succeeds with a fresh username', async () => {
    const usersAtStart = await helper.usersInDb()


    const newUser = {
      username: 'mluukkai',
      name: 'Matti Luukkainen',
      password: 'salassana',
    }

    await api
      .post('/api/users')
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toHaveLength(usersAtStart.length + 1)

    const usernames = usersAtEnd.map(u => u.username)
    expect(usernames).toContain(newUser.username)
  })

  test('creation fails with non unique username', async () => {
    const usersAtStart = await helper.usersInDb()


    const newUser = {
      username: 'root',
      name: '',
      password: 'salasa',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(result.body.error).toContain('username must be unique')

    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })
  test('creation fails with blank username', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: '',
      name: 'rooster',
      password: 'salas',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(result.body.error).toContain('username must be defined')

    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })

  test('creation fails with null username', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: null,
      name: 'rooster',
      password: 'salasaa',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(result.body.error).toContain('username must be defined')

    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })

  test('creation fails with blank password', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'jjlehto',
      name: 'rooster',
      password: '',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(result.body.error).toContain('password must be defined')

    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })

  test('creation fails with null password', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'jjlehto',
      name: 'rooster',
      password: null,
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(result.body.error).toContain('password must be defined')

    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })

  test('creation fails with username length less than 3', async () => {
    const usersAtStart = await helper.usersInDb()


    const newUser = {
      username: 'Ju',
      name: 'rooster',
      password: 'salsasann',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(result.body.error).toContain('username must be atleat 3 characters long')

    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })

  test('creation fails with password length less than 3', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'Jukka',
      name: 'JukkaJ',
      password: 'ds',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(result.body.error).toContain('password must be atleast 3 characters long')

    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })
})

afterAll(() => {
  mongoose.connection.close()
})