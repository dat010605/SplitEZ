const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Hàm gửi thông báo nhắc nợ tự động (Ví dụ: chạy mỗi tuần một lần)
exports.scheduledDebtReminder = functions.pubsub.schedule('every monday 09:00').onRun(async (context) => {
  const db = admin.firestore();
  
  try {
    // Trong thực tế, bạn sẽ duyệt qua tất cả các nhóm
    // Lấy thông tin nợ và tìm ra ai đang nợ ai
    // Để ví dụ, chúng ta sẽ gửi thông báo chung cho những ai có nợ
    
    // Lấy tất cả user có pushToken
    const usersSnap = await db.collection('users').where('pushToken', '!=', null).get();
    
    const messages = [];
    
    for (const doc of usersSnap.docs) {
      const userData = doc.data();
      if (userData.pushToken) {
        messages.push({
          to: userData.pushToken,
          sound: 'default',
          title: 'Nhắc nhở SplitEZ 🔔',
          body: 'Đã đến hạn kiểm tra nợ của bạn tuần này. Hãy vào ứng dụng để thanh toán nhé!',
        });
      }
    }
    
    // Gửi batch notification qua Expo (Hoặc bạn có thể dùng Firebase FCM trực tiếp)
    // Để gửi qua Expo:
    if (messages.length > 0) {
      const fetch = require('node-fetch');
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
      console.log(`Đã gửi ${messages.length} thông báo nhắc nợ.`);
    }
    
    return null;
  } catch (error) {
    console.error('Error sending scheduled reminders:', error);
    return null;
  }
});
