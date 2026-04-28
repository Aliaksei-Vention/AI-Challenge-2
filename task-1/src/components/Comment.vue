<template>
  <article class="comment-item">
    <div class="comment-head">
      <img
        :src="comment.photo || defaultPhoto"
        :alt="comment.name"
        class="comment-avatar"
      />
      <div class="comment-content">
        <div class="comment-meta">
          <span class="comment-name">{{ comment.name }}</span>
          <span class="comment-date">{{ comment.date }}</span>
        </div>

        <div v-if="isEditing" class="edit-wrap">
          <input
            v-model="editText"
            type="text"
            class="edit-input"
            @keydown.enter="saveEdit"
          />
        </div>
        <p v-else class="comment-text">
          {{ comment.text }}
          <span v-if="comment.editedAt" class="comment-edited-inline"> - Edited {{ comment.editedAt }}</span>
        </p>
      </div>
    </div>

    <div class="comment-actions">
      <button class="action-btn" type="button" @click="toggleReply">
        Reply
      </button>
      <span>•</span>
      <button
        class="action-btn"
        :class="comment.likedByMe ? 'cursor-pointer text-[#0ea5e9]' : 'cursor-pointer'"
        type="button"
        @click="emit('like', comment.id)"
      >
        {{ comment.likes }} <i class="fa fa-thumbs-up ml-1"></i>
      </button>
      <template v-if="comment.isMine">
        <span>•</span>
        <button
          v-if="!isEditing"
          class="action-btn"
          type="button"
          @click="startEdit"
        >
          Edit
        </button>
        <button
          v-else
          class="action-btn"
          type="button"
          @click="saveEdit"
        >
          Save
        </button>
      </template>
    </div>

    <div v-if="showReplyInput" class="reply-wrap">
      <img
        :src="defaultPhoto"
        alt="Reply avatar"
        class="reply-avatar"
      />
      <div class="reply-content">
        <div class="reply-input-shell">
          <button
            type="button"
            class="reply-close"
            aria-label="Close reply input"
            @click="closeReplyInput"
          >
            ✕
          </button>
          <textarea
            v-model="replyText"
            placeholder="Add a comment"
            class="reply-input"
            rows="1"
            @input="autoResizeTextarea"
            @keydown.enter.prevent="sendReply"
          ></textarea>
        </div>
        <div class="reply-actions">
          <button
            type="button"
            class="reply-send-btn"
            :disabled="!replyText.trim()"
            @click="sendReply"
          >
            Send
          </button>
        </div>
      </div>
    </div>

    <div v-if="comment.replies && comment.replies.length" class="replies-list">
      <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
        <div class="reply-meta">{{ reply.name }} · <span class="reply-meta-date">{{ reply.date }}</span></div>
        <div class="reply-text">{{ reply.text }}</div>
      </div>
    </div>
  </article>
</template>

<script setup>
import { ref, watch } from 'vue';
import defaultPhoto from '../../images/userphoto.jpg';

const props = defineProps({
  comment: { type: Object, required: true },
});

const emit = defineEmits(['like', 'save-edit', 'add-reply']);

const isEditing = ref(false);
const editText = ref(props.comment.text || '');
const showReplyInput = ref(false);
const replyText = ref('');

const autoResizeTextarea = (event) => {
  const textarea = event.target;
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
};

watch(
  () => props.comment.text,
  (next) => {
    if (!isEditing.value) editText.value = next || '';
  },
);

const startEdit = () => {
  isEditing.value = true;
  editText.value = props.comment.text || '';
};

const saveEdit = () => {
  const text = editText.value.trim();
  if (!text) return;
  emit('save-edit', { id: props.comment.id, text });
  isEditing.value = false;
};

const toggleReply = () => {
  showReplyInput.value = !showReplyInput.value;
};

const closeReplyInput = () => {
  showReplyInput.value = false;
  replyText.value = '';
};

const sendReply = () => {
  const text = replyText.value.trim();
  if (!text) return;
  emit('add-reply', { id: props.comment.id, text });
  replyText.value = '';
  showReplyInput.value = false;
};
</script>

<style scoped>
.comment-item {
  @apply py-3 border-t border-[#e6ebf3];
}

.comment-head {
  @apply flex items-start gap-3;
}

.comment-avatar {
  @apply w-14 h-14 rounded-full object-cover shrink-0 border border-[#d8e0ea];
}

.comment-content {
  @apply flex-1 min-w-0;
}

.comment-meta {
  @apply flex items-center justify-between gap-2;
}

.comment-name {
  @apply font-bold text-gray-900 text-[0.85rem];
}

.comment-date {
  @apply text-[0.7rem] text-[#9aa3b2] whitespace-nowrap;
}

.edit-wrap {
  @apply mt-1;
}

.edit-input {
  @apply w-full border border-[#dbe4ee] px-2 py-1 text-[0.85rem];
}

.comment-text {
  @apply mt-1 mb-0 text-gray-900 text-[0.85rem] break-words;
  overflow-wrap: anywhere;
}

.comment-edited-inline {
  @apply text-[0.75rem] text-[#9aa3b2] italic;
}

.comment-actions {
  @apply mt-2 ml-[72px] flex items-center gap-2 text-[#808a9c] text-[0.83rem];
}

.action-btn {
  @apply border-none bg-transparent p-0 text-inherit cursor-pointer;
}

.reply-wrap {
  @apply mt-2 ml-[72px] flex items-start gap-2;
}

.reply-avatar {
  @apply w-10 h-10 rounded-full object-cover shrink-0 border border-[#d8e0ea];
}

.reply-content {
  @apply relative flex-1;
}

.reply-input-shell {
  @apply relative border border-[#ccc] bg-white px-2 py-1.5;
}

.reply-close {
  @apply absolute right-2 top-1 text-[#94a3b8] hover:text-[#475569] text-[0.68rem] leading-none;
}

.reply-input {
  @apply w-full border-none outline-none text-[0.82rem] leading-5 text-gray-900 placeholder:text-gray-400 pr-5 bg-transparent resize-none overflow-hidden;
}

.reply-actions {
  @apply mt-1.5 flex justify-end;
}

.reply-send-btn {
  @apply h-8 px-4 border border-black bg-black text-white text-[0.78rem] font-semibold disabled:bg-[#cbd5e1] disabled:border-[#cbd5e1] disabled:cursor-not-allowed;
}

.replies-list {
  @apply mt-2 ml-[72px] grid gap-2;
}

.reply-item {
  @apply border-l-2 border-[#e2e8f0] pl-2;
}

.reply-meta {
  @apply text-[0.78rem] text-gray-900 font-semibold;
}

.reply-meta-date {
  @apply text-[#9aa3b2] font-normal;
}

.reply-text {
  @apply text-[0.82rem] text-gray-600 break-words;
  overflow-wrap: anywhere;
}
</style>
