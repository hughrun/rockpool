db.createUser({
  user: 'rockpool',
  pwd: 'change_this_password',
  roles: [
    {
      role: 'dbAdmin',
      db: 'rockpool_docker',
    },
    {
      role: 'readWrite',
      db: 'rockpool_docker'
    },
    {
      role: 'readWrite',
      db: 'passwordless-token'
    },
    {
      role: 'dbAdmin',
      db: 'passwordless-token'
    },
  ],
})