db.createUser({
  user: 'rockpool',
  pwd: 'change_this_password',
  roles: [
    {
      role: 'dbAdmin',
      db: 'rockpool',
    },
    {
      role: 'readWrite',
      db: 'rockpool'
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