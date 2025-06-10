const db = require('@replit/database');

function trackDailyUser(userId) {
  const today = new Date().toISOString().split('T')[0];
  db.get(`dau-${today}`).then(data => {
    const users = data ? JSON.parse(data) : [];
    if (!users.includes(userId)) {
      users.push(userId);
      db.set(`dau-${today}`, JSON.stringify(users));
    }
  });
}

module.exports = { trackDailyUser };  