/* ============================================
   Firebase 配置
   ============================================
   使用说明（给你自己的 Firebase 项目）：

   1. 打开 https://console.firebase.google.com/ 创建一个新的 Web 项目
   2. 进入项目后，点击左边菜单的 "添加应用" → 选 Web 图标 (</>)
   3. 随便填个名字，注册应用，会给你一段 firebaseConfig 代码
   4. 把那段代码里的 apiKey, authDomain, databaseURL, projectId, storageBucket, messagingSenderId, appId
      填到下面 window.firebaseConfig 的对应位置
   5. databaseURL 必须是你的 Realtime Database 的地址（格式：https://XXX.firebaseio.com）

   如果暂时不配置 Firebase，投票功能会降级为"本地模拟"（只能自己看自己投的），
   其他功能（小说阅读、打字机效果）完全不受影响。
*/
window.firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "0000000000",
  appId: "YOUR_APP_ID"
};

// 尝试初始化 Firebase
try {
  if (window.firebase && window.firebaseConfig && !window.firebaseConfig.apiKey.startsWith("YOUR_")) {
    window.fbApp = firebase.initializeApp(window.firebaseConfig);
    window.fbDb = firebase.database();
    console.log("[MoYuGO] Firebase 已连接 ✅");
  } else {
    console.warn("[MoYuGO] 未配置 Firebase，投票功能将使用本地模拟模式");
  }
} catch(e) {
  console.warn("[MoYuGO] Firebase 初始化失败:", e.message);
}
