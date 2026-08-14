/* =========================================================
   WEB Messenger — application logic
   Vanilla JS. No dependencies. No build step.

   Sections:
     1. Constants & storage keys
     2. Demo data (first-run seed)
     3. Data layer (localStorage-backed, API-shaped)
     4. Application state
     5. DOM references
     6. Rendering — sidebar / conversation list
     7. Rendering — chat / messages
     8. Sending messages & demo auto-replies
     9. Search
    10. Theme
    11. Emoji picker
    12. Mobile navigation
    13. Event wiring
    14. Init
   ========================================================= */

(function () {
  "use strict";

  /* =========================================================
     1. Constants & storage keys
     ========================================================= */

  const STORAGE_KEYS = {
    CHATS: "webmsg.chats",
    MESSAGES: "webmsg.messages",
    SELECTED_CHAT: "webmsg.selectedChat",
    THEME: "webmsg.theme",
    ME: "webmsg.me",
    SEEDED: "webmsg.seeded",
  };

  const AVATAR_COLORS = ["1", "2", "3", "4", "5", "6"];

  /* =========================================================
     2. Demo data (first-run seed)
     ========================================================= */

  function minutesAgo(mins) {
    return Date.now() - mins * 60 * 1000;
  }

  function hoursAgo(hrs) {
    return Date.now() - hrs * 60 * 60 * 1000;
  }

  function daysAgo(days) {
    return Date.now() - days * 24 * 60 * 60 * 1000;
  }

  function buildSeedData() {
    const chats = [
      { id: "alex", name: "Alex Morgan", color: "1", online: true, unread: 2, muted: false },
      { id: "maria", name: "Maria Santos", color: "2", online: true, unread: 0, muted: false },
      { id: "daniel", name: "Daniel Kim", color: "3", online: false, unread: 0, muted: false },
      { id: "emma", name: "Emma Clarke", color: "4", online: true, unread: 1, muted: false },
      { id: "john", name: "John Reyes", color: "5", online: false, unread: 0, muted: false },
    ];

    const messages = {
      alex: [
        { id: "m1", from: "them", text: "Hey! Did you see the new design mockups?", time: daysAgo(1), status: "read" },
        { id: "m2", from: "me", text: "Just opened them now, looking good so far!", time: daysAgo(1) + 60000, status: "read" },
        { id: "m3", from: "them", text: "Nice. Can you check the mobile nav spacing?", time: hoursAgo(5), status: "read" },
        { id: "m4", from: "them", text: "Also, are we still on for the sync tomorrow?", time: minutesAgo(40), status: "read" },
        { id: "m5", from: "them", text: "Got it 👍 talk soon", time: minutesAgo(12), status: "read" },
      ],
      maria: [
        { id: "m1", from: "them", text: "Morning! Coffee later?", time: hoursAgo(20), status: "read" },
        { id: "m2", from: "me", text: "Sure, 3pm works for me.", time: hoursAgo(19) + 300000, status: "read" },
        { id: "m3", from: "them", text: "Perfect 😊 see you then!", time: hoursAgo(19) + 360000, status: "read" },
        { id: "m4", from: "them", text: "By the way, thank you for yesterday, it really helped.", time: hoursAgo(3), status: "read" },
      ],
      daniel: [
        { id: "m1", from: "them", text: "Pushed the fix to the staging branch.", time: daysAgo(3), status: "read" },
        { id: "m2", from: "me", text: "Awesome, I'll pull it and test now.", time: daysAgo(3) + 120000, status: "read" },
        { id: "m3", from: "them", text: "Sounds good. Ping me if anything breaks.", time: daysAgo(2), status: "read" },
        { id: "m4", from: "them", text: "Nice work on the release, by the way.", time: daysAgo(1), status: "read" },
      ],
      emma: [
        { id: "m1", from: "them", text: "Can you send over the report when you get a chance?", time: hoursAgo(6), status: "read" },
        { id: "m2", from: "me", text: "Yep, sending it over in a few minutes.", time: hoursAgo(6) + 240000, status: "read" },
        { id: "m3", from: "them", text: "Thank you! No rush at all.", time: hoursAgo(1), status: "read" },
      ],
      john: [
        { id: "m1", from: "them", text: "Welcome to the team! Let me know if you need anything.", time: daysAgo(6), status: "read" },
        { id: "m2", from: "me", text: "Thanks John, really appreciate it!", time: daysAgo(6) + 60000, status: "read" },
        { id: "m3", from: "them", text: "Anytime. Let's grab lunch sometime this week.", time: daysAgo(4), status: "read" },
      ],
    };

    // Mark the last "them" message in unread chats as unread by leaving unread count > 0.
    return { chats, messages };
  }

  const DEMO_REPLIES = {
    alex: ["Got it 👍", "Sounds good!", "I'll check it.", "Perfect.", "Makes sense to me.", "On it!"],
    maria: ["Okay!", "Perfect 😊", "Let's do it.", "Sounds great!", "Yes, absolutely!", "Love that."],
    daniel: ["Sure.", "Got you.", "Nice!", "I'll take a look.", "Sounds solid.", "Cool, thanks."],
    emma: ["Thank you!", "That works for me.", "Great, appreciate it.", "Perfect timing.", "Got it, thanks!"],
    john: ["Sounds good to me.", "Will do.", "Thanks for the update.", "Great, see you then.", "Appreciate it!"],
  };

  /* =========================================================
     3. Data layer
     (localStorage now — designed to be swapped for a real
     API / WebSocket backend later without touching callers)
     ========================================================= */

  const DataLayer = {
    _readJSON(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (err) {
        console.warn("WEB Messenger: failed to read", key, err);
        return fallback;
      }
    },

    _writeJSON(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (err) {
        console.warn("WEB Messenger: failed to write", key, err);
        return false;
      }
    },

    seedIfNeeded() {
      if (localStorage.getItem(STORAGE_KEYS.SEEDED)) return;
      const seed = buildSeedData();
      this._writeJSON(STORAGE_KEYS.CHATS, seed.chats);
      this._writeJSON(STORAGE_KEYS.MESSAGES, seed.messages);
      this._writeJSON(STORAGE_KEYS.SELECTED_CHAT, "alex");
      this._writeJSON(STORAGE_KEYS.ME, { name: "You", color: "1" });
      localStorage.setItem(STORAGE_KEYS.SEEDED, "1");
    },

    // ---- Chats ----
    getChats() {
      return this._readJSON(STORAGE_KEYS.CHATS, []);
    },

    saveChats(chats) {
      return this._writeJSON(STORAGE_KEYS.CHATS, chats);
    },

    getChat(chatId) {
      return this.getChats().find((c) => c.id === chatId) || null;
    },

    updateChat(chatId, patch) {
      const chats = this.getChats();
      const idx = chats.findIndex((c) => c.id === chatId);
      if (idx === -1) return null;
      chats[idx] = Object.assign({}, chats[idx], patch);
      this.saveChats(chats);
      return chats[idx];
    },

    // ---- Messages ----
    getAllMessages() {
      return this._readJSON(STORAGE_KEYS.MESSAGES, {});
    },

    getMessages(chatId) {
      const all = this.getAllMessages();
      return all[chatId] || [];
    },

    saveMessage(chatId, message) {
      const all = this.getAllMessages();
      if (!all[chatId]) all[chatId] = [];
      all[chatId].push(message);
      this._writeJSON(STORAGE_KEYS.MESSAGES, all);
      return message;
    },

    updateMessage(chatId, messageId, patch) {
      const all = this.getAllMessages();
      const list = all[chatId];
      if (!list) return null;
      const idx = list.findIndex((m) => m.id === messageId);
      if (idx === -1) return null;
      list[idx] = Object.assign({}, list[idx], patch);
      this._writeJSON(STORAGE_KEYS.MESSAGES, all);
      return list[idx];
    },

    clearMessages(chatId) {
      const all = this.getAllMessages();
      all[chatId] = [];
      this._writeJSON(STORAGE_KEYS.MESSAGES, all);
    },

    sendMessage(chatId, text) {
      const message = {
        id: "m_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        from: "me",
        text: text,
        time: Date.now(),
        status: "sent",
      };
      return this.saveMessage(chatId, message);
    },

    searchMessages(chatId, query) {
      const list = this.getMessages(chatId);
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return list.filter((m) => m.text.toLowerCase().includes(q));
    },

    searchAll(query) {
      const q = query.trim().toLowerCase();
      if (!q) return { chats: [], messages: [] };
      const chats = this.getChats().filter((c) => c.name.toLowerCase().includes(q));
      const all = this.getAllMessages();
      const messageHits = [];
      Object.keys(all).forEach((chatId) => {
        all[chatId].forEach((m) => {
          if (m.text.toLowerCase().includes(q)) {
            messageHits.push({ chatId: chatId, message: m });
          }
        });
      });
      messageHits.sort((a, b) => b.message.time - a.message.time);
      return { chats: chats, messages: messageHits };
    },

    // ---- Selection / settings ----
    getSelectedChat() {
      return this._readJSON(STORAGE_KEYS.SELECTED_CHAT, null);
    },

    setSelectedChat(chatId) {
      this._writeJSON(STORAGE_KEYS.SELECTED_CHAT, chatId);
    },

    getTheme() {
      return this._readJSON(STORAGE_KEYS.THEME, null);
    },

    setTheme(theme) {
      this._writeJSON(STORAGE_KEYS.THEME, theme);
    },

    getMe() {
      return this._readJSON(STORAGE_KEYS.ME, { name: "You", color: "1" });
    },
  };

  /* =========================================================
     4. Application state
     ========================================================= */

  const state = {
    chats: [],
    selectedChatId: null,
    searchQuery: "",
    inlineSearchQuery: "",
    inlineSearchMatches: [],
    emojiPickerOpen: false,
    typingTimeouts: {},
  };

  /* =========================================================
     5. DOM references
     ========================================================= */

  const el = {};

  function cacheDom() {
    el.app = document.getElementById("app");
    el.sidebar = document.getElementById("sidebar");
    el.themeToggle = document.getElementById("themeToggle");
    el.meAvatar = document.getElementById("meAvatar");
    el.meName = document.getElementById("meName");
    el.searchInput = document.getElementById("searchInput");
    el.searchClear = document.getElementById("searchClear");
    el.conversationList = document.getElementById("conversationList");
    el.searchResults = document.getElementById("searchResults");

    el.chatArea = document.getElementById("chatArea");
    el.chatEmpty = document.getElementById("chatEmpty");
    el.chatActive = document.getElementById("chatActive");
    el.backBtn = document.getElementById("backBtn");
    el.chatAvatar = document.getElementById("chatAvatar");
    el.chatAvatarInitial = document.getElementById("chatAvatarInitial");
    el.chatStatusDot = document.getElementById("chatStatusDot");
    el.chatHeaderName = document.getElementById("chatHeaderName");
    el.chatHeaderStatus = document.getElementById("chatHeaderStatus");
    el.chatSearchBtn = document.getElementById("chatSearchBtn");
    el.chatMoreBtn = document.getElementById("chatMoreBtn");
    el.moreMenu = document.getElementById("moreMenu");
    el.clearChatBtn = document.getElementById("clearChatBtn");
    el.muteChatBtn = document.getElementById("muteChatBtn");

    el.chatInlineSearch = document.getElementById("chatInlineSearch");
    el.chatInlineSearchInput = document.getElementById("chatInlineSearchInput");
    el.inlineSearchCount = document.getElementById("inlineSearchCount");
    el.chatInlineSearchClose = document.getElementById("chatInlineSearchClose");

    el.messages = document.getElementById("messages");
    el.typingIndicator = document.getElementById("typingIndicator");
    el.typingName = document.getElementById("typingName");

    el.composerForm = document.getElementById("composerForm");
    el.messageInput = document.getElementById("messageInput");
    el.sendBtn = document.getElementById("sendBtn");
    el.emojiBtn = document.getElementById("emojiBtn");
    el.emojiPicker = document.getElementById("emojiPicker");
  }

  /* =========================================================
     Helpers
     ========================================================= */

  function initials(name) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("");
  }

  function formatTime(ts) {
    const d = new Date(ts);
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const mm = minutes < 10 ? "0" + minutes : String(minutes);
    return hours + ":" + mm + " " + ampm;
  }

  function formatListTime(ts) {
    const now = new Date();
    const d = new Date(ts);
    const sameDay = now.toDateString() === d.toDateString();
    if (sameDay) return formatTime(ts);

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (yesterday.toDateString() === d.toDateString()) return "Yesterday";

    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return d.toLocaleDateString(undefined, { weekday: "short" });
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function formatDayDivider(ts) {
    const now = new Date();
    const d = new Date(ts);
    if (now.toDateString() === d.toDateString()) return "Today";
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (yesterday.toDateString() === d.toDateString()) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  }

  function debounce(fn, wait) {
    let t;
    return function () {
      clearTimeout(t);
      const args = arguments;
      t = setTimeout(() => fn.apply(null, args), wait);
    };
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Safely highlight `query` within `text`, returning a DocumentFragment.
  // Never uses innerHTML on user-generated text.
  function highlightText(container, text, query) {
    container.textContent = "";
    if (!query) {
      container.textContent = text;
      return;
    }
    const re = new RegExp("(" + escapeRegExp(query) + ")", "ig");
    const parts = text.split(re);
    parts.forEach((part) => {
      if (part.toLowerCase() === query.toLowerCase()) {
        const mark = document.createElement("mark");
        mark.textContent = part;
        container.appendChild(mark);
      } else if (part) {
        container.appendChild(document.createTextNode(part));
      }
    });
  }

  /* =========================================================
     6. Rendering — sidebar / conversation list
     ========================================================= */

  function renderMe() {
    const me = DataLayer.getMe();
    el.meAvatar.dataset.color = me.color;
    el.meAvatar.querySelector("span").textContent = initials(me.name);
    el.meName.textContent = me.name;
  }

  function chatLastMessage(chatId) {
    const msgs = DataLayer.getMessages(chatId);
    return msgs.length ? msgs[msgs.length - 1] : null;
  }

  function renderConversationList() {
    const chats = DataLayer.getChats().slice();

    chats.sort((a, b) => {
      const la = chatLastMessage(a.id);
      const lb = chatLastMessage(b.id);
      const ta = la ? la.time : 0;
      const tb = lb ? lb.time : 0;
      return tb - ta;
    });

    el.conversationList.textContent = "";

    if (chats.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-list-msg";
      empty.textContent = "No conversations yet.";
      el.conversationList.appendChild(empty);
      return;
    }

    chats.forEach((chat) => {
      const last = chatLastMessage(chat.id);
      const item = document.createElement("button");
      item.type = "button";
      item.className = "conversation-item" + (chat.id === state.selectedChatId ? " active" : "");
      item.setAttribute("role", "listitem");
      item.setAttribute("data-chat-id", chat.id);
      item.setAttribute("aria-current", chat.id === state.selectedChatId ? "true" : "false");

      const avatar = document.createElement("div");
      avatar.className = "avatar avatar-md";
      avatar.dataset.color = chat.color;
      const avatarSpan = document.createElement("span");
      avatarSpan.textContent = initials(chat.name);
      avatar.appendChild(avatarSpan);
      const dot = document.createElement("span");
      dot.className = "status-dot" + (chat.online ? " online" : "");
      avatar.appendChild(dot);
      item.appendChild(avatar);

      const body = document.createElement("div");
      body.className = "conv-body";

      const topRow = document.createElement("div");
      topRow.className = "conv-top-row";
      const nameEl = document.createElement("span");
      nameEl.className = "conv-name";
      nameEl.textContent = chat.name;
      topRow.appendChild(nameEl);
      const timeEl = document.createElement("span");
      timeEl.className = "conv-time";
      timeEl.textContent = last ? formatListTime(last.time) : "";
      topRow.appendChild(timeEl);
      body.appendChild(topRow);

      const bottomRow = document.createElement("div");
      bottomRow.className = "conv-bottom-row";
      const preview = document.createElement("span");
      preview.className = "conv-preview";
      let previewText = "No messages yet";
      if (last) {
        previewText = (last.from === "me" ? "You: " : "") + last.text;
      }
      preview.textContent = previewText;
      bottomRow.appendChild(preview);

      if (chat.unread > 0) {
        const badge = document.createElement("span");
        badge.className = "unread-badge";
        badge.textContent = chat.unread > 99 ? "99+" : String(chat.unread);
        bottomRow.appendChild(badge);
      }

      body.appendChild(bottomRow);
      item.appendChild(body);

      item.addEventListener("click", () => selectChat(chat.id));
      el.conversationList.appendChild(item);
    });
  }

  /* =========================================================
     7. Rendering — chat / messages
     ========================================================= */

  function selectChat(chatId) {
    state.selectedChatId = chatId;
    DataLayer.setSelectedChat(chatId);

    // Clear unread count on open
    DataLayer.updateChat(chatId, { unread: 0 });

    clearInlineSearch();
    closeEmojiPicker();
    closeMoreMenu();

    renderConversationList();
    renderChatHeader();
    renderMessages();
    openChatOnMobile();

    el.messageInput.focus({ preventScroll: true });
  }

  function renderChatHeader() {
    const chat = DataLayer.getChat(state.selectedChatId);
    if (!chat) {
      el.chatEmpty.hidden = false;
      el.chatActive.hidden = true;
      return;
    }
    el.chatEmpty.hidden = true;
    el.chatActive.hidden = false;

    el.chatAvatar.dataset.color = chat.color;
    el.chatAvatarInitial.textContent = initials(chat.name);
    el.chatStatusDot.className = "status-dot" + (chat.online ? " online" : "");
    el.chatHeaderName.textContent = chat.name;
    el.chatHeaderStatus.textContent = chat.online ? "Online" : "Offline";
    el.chatHeaderStatus.className = "chat-header-status" + (chat.online ? " online" : "");
    el.muteChatBtn.textContent = chat.muted ? "Unmute notifications" : "Mute notifications";
  }

  function messageStatusIcon(status) {
    // returns an SVG element representing sent / delivered / read
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "10");
    svg.setAttribute("viewBox", "0 0 16 10");
    svg.setAttribute("fill", "none");

    function makeCheck(offsetX) {
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute(
        "d",
        `M${1 + offsetX} 5L${4 + offsetX} 8L${10 + offsetX} 1`
      );
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "1.6");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      return path;
    }

    if (status === "sent") {
      svg.appendChild(makeCheck(0));
    } else {
      // delivered / read: double check
      const g1 = makeCheck(-2);
      const g2 = makeCheck(2);
      svg.appendChild(g1);
      svg.appendChild(g2);
    }
    return svg;
  }

  function renderMessages(highlightQuery) {
    const chat = DataLayer.getChat(state.selectedChatId);
    el.messages.textContent = "";
    if (!chat) return;

    const msgs = DataLayer.getMessages(chat.id);
    let lastDay = null;
    let lastFrom = null;

    msgs.forEach((m, idx) => {
      const dayLabel = formatDayDivider(m.time);
      if (dayLabel !== lastDay) {
        const divider = document.createElement("div");
        divider.className = "day-divider";
        const span = document.createElement("span");
        span.textContent = dayLabel;
        divider.appendChild(span);
        el.messages.appendChild(divider);
        lastDay = dayLabel;
        lastFrom = null;
      }

      const row = document.createElement("div");
      const isOut = m.from === "me";
      row.className = "msg-row " + (isOut ? "out" : "in");
      row.dataset.msgId = m.id;

      const showAvatar = !isOut && lastFrom !== "them";
      if (showAvatar) row.classList.add("show-avatar");

      if (!isOut) {
        const avatar = document.createElement("div");
        avatar.className = "avatar avatar-sm";
        avatar.dataset.color = chat.color;
        const span = document.createElement("span");
        span.textContent = initials(chat.name);
        avatar.appendChild(span);
        row.appendChild(avatar);
      }

      const wrap = document.createElement("div");
      wrap.className = "msg-bubble-wrap";

      const bubble = document.createElement("div");
      bubble.className = "bubble";
      // Safe rendering: textContent / highlight helper only, never innerHTML.
      highlightText(bubble, m.text, highlightQuery);
      wrap.appendChild(bubble);

      const meta = document.createElement("div");
      meta.className = "msg-meta";
      const timeSpan = document.createElement("span");
      timeSpan.textContent = formatTime(m.time);
      meta.appendChild(timeSpan);
      if (isOut) {
        const statusSpan = document.createElement("span");
        statusSpan.className = "msg-status" + (m.status === "read" ? " read" : "");
        statusSpan.appendChild(messageStatusIcon(m.status));
        meta.appendChild(statusSpan);
      }
      wrap.appendChild(meta);

      row.appendChild(wrap);
      el.messages.appendChild(row);

      lastFrom = isOut ? "me" : "them";
    });

    scrollMessagesToBottom();
  }

  function scrollMessagesToBottom() {
    requestAnimationFrame(() => {
      el.messages.scrollTop = el.messages.scrollHeight;
    });
  }

  /* =========================================================
     8. Sending messages & demo auto-replies
     ========================================================= */

  function updateSendBtnState() {
    const hasText = el.messageInput.value.trim().length > 0;
    el.sendBtn.disabled = !hasText;
  }

  function autoResizeTextarea() {
    el.messageInput.style.height = "auto";
    el.messageInput.style.height = Math.min(el.messageInput.scrollHeight, 140) + "px";
  }

  function handleSend(e) {
    if (e) e.preventDefault();
    const text = el.messageInput.value.trim();
    if (!text || !state.selectedChatId) return;

    const chatId = state.selectedChatId;
    DataLayer.sendMessage(chatId, text);

    el.messageInput.value = "";
    autoResizeTextarea();
    updateSendBtnState();
    closeEmojiPicker();

    renderMessages();
    renderConversationList();

    // Simulate delivery -> read ticks shortly after sending.
    const msgs = DataLayer.getMessages(chatId);
    const justSent = msgs[msgs.length - 1];
    setTimeout(() => {
      DataLayer.updateMessage(chatId, justSent.id, { status: "delivered" });
      if (state.selectedChatId === chatId) renderMessages();
    }, 500);
    setTimeout(() => {
      DataLayer.updateMessage(chatId, justSent.id, { status: "read" });
      if (state.selectedChatId === chatId) renderMessages();
    }, 1400);

    scheduleAutoReply(chatId);
  }

  function scheduleAutoReply(chatId) {
    const replies = DEMO_REPLIES[chatId];
    if (!replies || !replies.length) return;

    // Clear any pending reply for this chat to avoid overlap.
    if (state.typingTimeouts[chatId]) {
      clearTimeout(state.typingTimeouts[chatId].typing);
      clearTimeout(state.typingTimeouts[chatId].reply);
    }

    const typingDelay = 700 + Math.random() * 600;
    const replyDelay = typingDelay + 900 + Math.random() * 1300;

    const typingTimer = setTimeout(() => {
      if (state.selectedChatId === chatId) showTypingIndicator(chatId);
    }, typingDelay);

    const replyTimer = setTimeout(() => {
      const reply = replies[Math.floor(Math.random() * replies.length)];
      DataLayer.saveMessage(chatId, {
        id: "m_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        from: "them",
        text: reply,
        time: Date.now(),
        status: "read",
      });

      if (state.selectedChatId === chatId) {
        hideTypingIndicator();
        renderMessages();
      } else {
        const chat = DataLayer.getChat(chatId);
        if (chat) DataLayer.updateChat(chatId, { unread: (chat.unread || 0) + 1 });
      }
      renderConversationList();
    }, replyDelay);

    state.typingTimeouts[chatId] = { typing: typingTimer, reply: replyTimer };
  }

  function showTypingIndicator(chatId) {
    const chat = DataLayer.getChat(chatId);
    if (!chat) return;
    el.typingName.textContent = chat.name;
    el.typingIndicator.hidden = false;
    scrollMessagesToBottom();
  }

  function hideTypingIndicator() {
    el.typingIndicator.hidden = true;
  }

  /* =========================================================
     9. Search
     ========================================================= */

  function renderSidebarSearch(query) {
    if (!query) {
      el.searchResults.hidden = true;
      el.searchResults.textContent = "";
      el.conversationList.hidden = false;
      el.searchClear.hidden = true;
      return;
    }

    el.searchClear.hidden = false;
    el.conversationList.hidden = true;
    el.searchResults.hidden = false;
    el.searchResults.textContent = "";

    const results = DataLayer.searchAll(query);

    if (results.chats.length === 0 && results.messages.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-list-msg";
      empty.textContent = 'No results for "' + query + '"';
      el.searchResults.appendChild(empty);
      return;
    }

    if (results.chats.length) {
      const label = document.createElement("div");
      label.className = "search-section-label";
      label.textContent = "People";
      el.searchResults.appendChild(label);

      results.chats.forEach((chat) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "conversation-item";
        const avatar = document.createElement("div");
        avatar.className = "avatar avatar-md";
        avatar.dataset.color = chat.color;
        const span = document.createElement("span");
        span.textContent = initials(chat.name);
        avatar.appendChild(span);
        item.appendChild(avatar);

        const body = document.createElement("div");
        body.className = "conv-body";
        const nameEl = document.createElement("div");
        nameEl.className = "conv-name";
        highlightText(nameEl, chat.name, query);
        body.appendChild(nameEl);
        item.appendChild(body);

        item.addEventListener("click", () => {
          clearSidebarSearch();
          selectChat(chat.id);
        });
        el.searchResults.appendChild(item);
      });
    }

    if (results.messages.length) {
      const label = document.createElement("div");
      label.className = "search-section-label";
      label.textContent = "Messages";
      el.searchResults.appendChild(label);

      results.messages.slice(0, 30).forEach((hit) => {
        const chat = DataLayer.getChat(hit.chatId);
        if (!chat) return;
        const item = document.createElement("button");
        item.type = "button";
        item.className = "search-result-item";

        const nameEl = document.createElement("div");
        nameEl.className = "search-result-name";
        nameEl.textContent = chat.name;
        item.appendChild(nameEl);

        const snippet = document.createElement("div");
        snippet.className = "search-result-snippet";
        highlightText(snippet, hit.message.text, query);
        item.appendChild(snippet);

        item.addEventListener("click", () => {
          clearSidebarSearch();
          selectChat(chat.id);
        });
        el.searchResults.appendChild(item);
      });
    }
  }

  function clearSidebarSearch() {
    el.searchInput.value = "";
    state.searchQuery = "";
    renderSidebarSearch("");
  }

  function renderInlineSearch(query) {
    state.inlineSearchQuery = query;
    if (!state.selectedChatId) return;

    if (!query) {
      el.inlineSearchCount.textContent = "";
      renderMessages();
      return;
    }

    const matches = DataLayer.searchMessages(state.selectedChatId, query);
    state.inlineSearchMatches = matches;
    el.inlineSearchCount.textContent = matches.length
      ? matches.length + (matches.length === 1 ? " match" : " matches")
      : "No matches";
    renderMessages(query);
  }

  function clearInlineSearch() {
    state.inlineSearchQuery = "";
    state.inlineSearchMatches = [];
    el.chatInlineSearchInput.value = "";
    el.inlineSearchCount.textContent = "";
    el.chatInlineSearch.hidden = true;
  }

  /* =========================================================
     10. Theme
     ========================================================= */

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
  }

  function initTheme() {
    let theme = DataLayer.getTheme();
    if (!theme) {
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      theme = prefersDark ? "dark" : "light";
    }
    applyTheme(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    DataLayer.setTheme(next);
  }

  /* =========================================================
     11. Emoji picker
     ========================================================= */

  const EMOJI_SET = [
    "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😉", "😎", "🤔",
    "😴", "😢", "😭", "😡", "🥳", "🙌", "👏", "👍", "👎", "🙏",
    "💪", "❤️", "🔥", "✨", "🎉", "✅", "❌", "⚡", "☀️", "🌙",
    "☕", "🍕", "🎂", "🚀", "📌", "📎", "💬", "🤝", "👀", "🙈",
  ];

  function buildEmojiPicker() {
    el.emojiPicker.textContent = "";
    EMOJI_SET.forEach((emoji) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = emoji;
      btn.setAttribute("aria-label", "Insert " + emoji);
      btn.addEventListener("click", () => insertEmoji(emoji));
      el.emojiPicker.appendChild(btn);
    });
  }

  function insertEmoji(emoji) {
    const input = el.messageInput;
    const start = input.selectionStart || input.value.length;
    const end = input.selectionEnd || input.value.length;
    const before = input.value.slice(0, start);
    const after = input.value.slice(end);
    input.value = before + emoji + after;
    const cursor = start + emoji.length;
    input.focus();
    input.setSelectionRange(cursor, cursor);
    autoResizeTextarea();
    updateSendBtnState();
  }

  function openEmojiPicker() {
    state.emojiPickerOpen = true;
    el.emojiPicker.hidden = false;
  }

  function closeEmojiPicker() {
    state.emojiPickerOpen = false;
    el.emojiPicker.hidden = true;
  }

  function toggleEmojiPicker() {
    if (state.emojiPickerOpen) closeEmojiPicker();
    else openEmojiPicker();
  }

  /* =========================================================
     12. Mobile navigation
     ========================================================= */

  function openChatOnMobile() {
    el.app.classList.add("chat-open");
  }

  function closeChatOnMobile() {
    el.app.classList.remove("chat-open");
  }

  /* =========================================================
     More menu
     ========================================================= */

  function toggleMoreMenu() {
    el.moreMenu.hidden = !el.moreMenu.hidden;
  }

  function closeMoreMenu() {
    el.moreMenu.hidden = true;
  }

  /* =========================================================
     13. Event wiring
     ========================================================= */

  function wireEvents() {
    el.themeToggle.addEventListener("click", toggleTheme);

    el.searchInput.addEventListener(
      "input",
      debounce(function (e) {
        state.searchQuery = e.target.value.trim();
        renderSidebarSearch(state.searchQuery);
      }, 120)
    );

    el.searchClear.addEventListener("click", clearSidebarSearch);

    el.backBtn.addEventListener("click", closeChatOnMobile);

    el.chatSearchBtn.addEventListener("click", function () {
      el.chatInlineSearch.hidden = !el.chatInlineSearch.hidden;
      if (!el.chatInlineSearch.hidden) {
        el.chatInlineSearchInput.focus();
      } else {
        clearInlineSearch();
        renderMessages();
      }
    });

    el.chatInlineSearchClose.addEventListener("click", function () {
      clearInlineSearch();
      renderMessages();
    });

    el.chatInlineSearchInput.addEventListener(
      "input",
      debounce(function (e) {
        renderInlineSearch(e.target.value.trim());
      }, 120)
    );

    el.chatMoreBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleMoreMenu();
    });

    document.addEventListener("click", function (e) {
      if (!el.moreMenu.hidden && !el.moreMenu.contains(e.target) && e.target !== el.chatMoreBtn) {
        closeMoreMenu();
      }
      if (
        state.emojiPickerOpen &&
        !el.emojiPicker.contains(e.target) &&
        e.target !== el.emojiBtn &&
        !el.emojiBtn.contains(e.target)
      ) {
        closeEmojiPicker();
      }
    });

    el.clearChatBtn.addEventListener("click", function () {
      if (!state.selectedChatId) return;
      DataLayer.clearMessages(state.selectedChatId);
      closeMoreMenu();
      renderMessages();
      renderConversationList();
    });

    el.muteChatBtn.addEventListener("click", function () {
      if (!state.selectedChatId) return;
      const chat = DataLayer.getChat(state.selectedChatId);
      const updated = DataLayer.updateChat(state.selectedChatId, { muted: !chat.muted });
      el.muteChatBtn.textContent = updated.muted ? "Unmute notifications" : "Mute notifications";
      closeMoreMenu();
    });

    el.composerForm.addEventListener("submit", handleSend);

    el.messageInput.addEventListener("input", function () {
      autoResizeTextarea();
      updateSendBtnState();
    });

    el.messageInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    el.emojiBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleEmojiPicker();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 860) {
        el.app.classList.remove("chat-open");
      }
    });
  }

  /* =========================================================
     14. Init
     ========================================================= */

  function init() {
    DataLayer.seedIfNeeded();
    cacheDom();
    initTheme();
    buildEmojiPicker();
    wireEvents();
    renderMe();

    state.chats = DataLayer.getChats();
    let selected = DataLayer.getSelectedChat();
    if (!selected || !DataLayer.getChat(selected)) {
      selected = state.chats.length ? state.chats[0].id : null;
    }
    state.selectedChatId = selected;

    renderConversationList();
    if (state.selectedChatId) {
      DataLayer.updateChat(state.selectedChatId, { unread: 0 });
      renderChatHeader();
      renderMessages();
      renderConversationList();
    } else {
      el.chatEmpty.hidden = false;
      el.chatActive.hidden = true;
    }

    updateSendBtnState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
