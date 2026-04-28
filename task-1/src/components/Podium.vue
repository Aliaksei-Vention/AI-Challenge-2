<template>
  <section
    class="podium-root"
    aria-label="Top three performers"
  >
    <article
      v-for="p in performers"
      :key="p.rank"
      class="podium-card"
      :class="[p.orderClass, performers.length === 1 ? 'col-start-2 max-[980px]:col-start-auto' : '']"
    >
      <div
        class="avatar-wrap"
        :class="[p.ringClass, p.rank === 1 ? 'w-[112px] h-[112px]' : 'w-[80px] h-[80px]']"
      >
        <div
          class="rank-badge"
          :class="[
            p.badgeClass,
            p.rank === 1 ? 'w-11 h-11 text-[1.1rem]' : 'w-8 h-8 text-[0.95rem]'
          ]"
        >{{ p.rank }}</div>
        <img
          :src="p.photo || defaultPhoto"
          :alt="p.firstName + ' ' + p.lastName"
          class="avatar-image"
        />
      </div>

      <h3 class="podium-name"
            style="font-family: Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;"
      >
        {{ p.firstName }} {{ p.lastName }}
      </h3>

      <p class="podium-title">{{ p.title }}</p>

      <div
        class="score-pill"
        :class="p.scoreClass"
      >
        <span class="leading-none" :class="p.starClass">★</span>
        <span :class="p.starClass">{{ p.score }}</span>
      </div>

      <div
        class="platform"
        style="font-family: Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;"
        :class="[
          p.rank === 1
            ? 'bg-[linear-gradient(180deg,#fef3c7,#fde68a)] border-t-[#fde047] h-[160px]'
            : 'bg-[linear-gradient(180deg,#e2e8f0,#cbd5e1)] border-t-[#cbd5e1]',
          p.rank === 1 ? 'text-[6rem] pt-4' : 'text-[4.7rem] pt-2',
          p.rank === 1 ? 'text-[rgba(234,179,8,0.2)]' : 'text-[rgba(148,163,184,0.2)]',
          p.rank === 2 ? 'h-[130px]' : '',
          p.rank === 3 ? 'h-[110px]' : ''
        ]"
      >{{ p.rank }}</div>
    </article>
  </section>
</template>

<script setup>
import defaultPhoto from '../../images/userphoto.jpg';

defineProps({
  performers: {
    type: Array,
    required: true,
  },
});
</script>

<style scoped>
.podium-root {
  @apply mt-[34px] grid [grid-template-columns:repeat(3,minmax(220px,1fr))] gap-8 items-end max-[980px]:grid-cols-1 max-[980px]:gap-[22px] max-w-[900px] mx-auto;
}

.podium-card {
  @apply text-center;
}

.avatar-wrap {
  @apply relative mx-auto mb-2 rounded-full p-[5px] shadow-[0_8px_18px_rgba(30,41,59,0.12)];
}

.rank-badge {
  @apply absolute rounded-full grid place-items-center text-white font-extrabold border-[3px] border-white;
}

.avatar-image {
  @apply w-full h-full rounded-full object-cover;
}

.podium-name {
  @apply mx-auto mb-0.5 text-gray-900 font-bold text-[1.4rem];
}

.podium-title {
  @apply mb-0 text-gray-500 text-[0.85rem] min-h-[32px];
}

.score-pill {
  @apply mt-0 mb-5 mx-auto w-fit rounded-full inline-flex items-center justify-center gap-1.5 px-4 py-[7px] text-[1.15rem] font-extrabold tracking-[0.4px] text-gray-900;
}

.platform {
  @apply w-full rounded-t-[12px] border-t-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] flex justify-center items-start overflow-hidden relative font-extrabold;
}
</style>
