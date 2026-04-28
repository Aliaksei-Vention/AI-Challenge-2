<template>
  <article
    class="rank-row"
    :class="{
      'rank-row-collapsed': !isExpanded,
      'rank-row-expanded': isExpanded
    }"
  >
    <div class="rank-number">{{ row.rank }}</div>

    <img
      :src="row.photo || defaultPhoto"
      :alt="row.firstName + ' ' + row.lastName"
      class="profile-avatar"
    />

    <div class="profile-info">
      <div class="profile-name">{{ row.firstName }} {{ row.lastName }}</div>
      <p class="profile-role">{{ row.role }}</p>
      <p v-if="row.department" class="profile-department">{{ row.department }}</p>
    </div>

    <!-- mobile divider -->
    <div class="mobile-divider"></div>

    <div class="achievements-wrap">
      <div class="achievements-list">
        <div
          v-for="item in row.achievements"
          :key="`${item.icon}-${item.category}-${item.count}`"
          class="achievement-item group"
        >
          <span class="achievement-icon">{{ item.icon }}</span>
          <span class="achievement-count">{{ item.count }}</span>
          <div class="achievement-tooltip">
            {{ item.category }}
            <div class="achievement-tooltip-arrow"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="total-wrap">
      <div class="total-divider"></div>

      <div class="total-info">
        <span class="total-label">TOTAL</span>
        <span class="total-value">
          <span class="total-star">★</span>{{ row.total }}
        </span>
      </div>
    </div>

    <button
      class="expand-btn"
      :class="{ 'expand-btn-expanded': isExpanded }"
      type="button"
      :aria-label="isExpanded ? 'Collapse row' : 'Expand row'"
      @click="$emit('toggle', row.rank)"
    >
      <svg
        class="expand-btn-icon"
        :class="{ 'rotate-180': isExpanded }"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  </article>

  <section
    v-if="isExpanded"
    class="expanded-panel"
    aria-label="Expanded activity details"
  >
    <section>
      <div class="expanded-separator"></div>
      <h3 class="expanded-title">RECENT ACTIVITY</h3>

      <div class="activities-scroll">
      <div
        class="activities-header"
        role="row"
      >
        <div>ACTIVITY</div>
        <div>CATEGORY</div>
        <div>DATE</div>
        <div>POINTS</div>
      </div>

      <div
        v-for="(activity, index) in recentActivities"
        :key="activity.title + activity.date"
        class="activity-row"
        :class="{ 'activity-row-first': index === 0 }"
        role="row"
      >
        <div class="activity-title">{{ activity.title }}</div>
        <div><span class="activity-category">{{ activity.category }}</span></div>
        <div class="activity-date">{{ activity.date }}</div>
        <div class="activity-points">{{ activity.points }}</div>
      </div>
      </div>
    </section>
  </section>
</template>

<script setup>
import defaultPhoto from '../../images/userphoto.jpg';

defineProps({
  row: { type: Object, required: true },
  isExpanded: { type: Boolean, default: false },
  recentActivities: { type: Array, default: () => [] },
});

defineEmits(['toggle']);

</script>

<style scoped>
.rank-row {
  @apply grid [grid-template-columns:44px_52px_minmax(200px,1.7fr)_minmax(160px,1fr)_auto_40px] max-[980px]:[grid-template-columns:38px_44px_1fr_40px] max-[980px]:[grid-template-rows:auto_auto_auto] items-center gap-4 max-[980px]:gap-x-3 max-[980px]:gap-y-0 bg-white border border-[#d6dee8] rounded-[14px] px-4 py-5 min-h-[94px] shadow-[0_2px_3px_rgba(15,23,42,0.07)] mb-[11px] hover:shadow-[1px_3px_7px_rgba(15,23,42,0.12)] transition-[box-shadow,border-color] duration-200;
}

.rank-row-collapsed {
  @apply hover:scale-[1.001];
}

.rank-row-expanded {
  @apply border-2 border-b-0 border-[#0ea5e9] shadow-[0_14px_28px_rgba(30,64,175,0.16)] rounded-b-none;
}

.rank-number {
  @apply min-w-8 pl-1 text-center text-[24px] font-bold text-[#94a3b8] max-[980px]:row-start-1 max-[980px]:col-start-1 max-[980px]:self-center;
}

.profile-avatar {
  @apply w-14 h-14 min-w-[56px] min-h-[56px] rounded-full object-cover border-[1.5px] border-[#d9e0ea] shrink-0 max-[980px]:row-start-1 max-[980px]:col-start-2;
}

.profile-info {
  @apply min-w-0 pl-2 max-[980px]:row-start-1 max-[980px]:col-start-3 max-[980px]:col-span-2;
}

.profile-name {
  @apply mb-0.5 text-[1.05rem] font-extrabold text-gray-900 truncate;
}

.profile-role {
  @apply m-0 text-gray-500 text-[0.84rem] leading-snug;
}

.profile-department {
  @apply m-0 text-gray-400 text-[0.8rem] leading-snug;
}

.mobile-divider {
  @apply hidden max-[980px]:block max-[980px]:row-start-2 max-[980px]:col-span-4 -mx-4 border-t border-[#e2e8f0] mt-3 mb-2;
}

.achievements-wrap {
  @apply flex items-center justify-self-end gap-4 max-[980px]:row-start-3 max-[980px]:col-start-1 max-[980px]:col-span-3 max-[980px]:justify-self-start max-[980px]:pb-1;
}

.achievements-list {
  @apply flex items-start gap-3;
}

.achievement-item {
  @apply relative inline-flex min-w-[34px] flex-col items-center gap-0.5 text-gray-700;
}

.achievement-icon {
  @apply text-[1.1rem] leading-none cursor-default;
}

.achievement-count {
  @apply text-[0.78rem] font-bold leading-none text-gray-500;
}

.achievement-tooltip {
  @apply pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-[#e2e8f0] text-gray-700 text-[0.82rem] font-semibold whitespace-nowrap shadow-md opacity-0 transition-opacity duration-150 z-10;
}

.achievement-item:hover .achievement-tooltip {
  opacity: 1;
}

.achievement-tooltip-arrow {
  @apply absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#e2e8f0];
}

.total-wrap {
  @apply flex items-center justify-self-end gap-4 max-[980px]:hidden;
}

.total-divider {
  @apply h-10 w-px bg-[#dbe4ee];
}

.total-info {
  @apply flex flex-col items-end gap-[3px] text-right;
}

.total-label {
  @apply text-[0.6rem] text-[#8a94a6] tracking-[0.8px] font-bold;
}

.total-value {
  @apply text-[#0ea5e9] text-[1.4rem] font-extrabold;
}

.total-star {
  @apply mr-1.5 text-[1.15em] leading-none text-[#0ea5e9];
}

.expand-btn {
  @apply border-none bg-[#eef2f7] text-[#0ea5e9] cursor-pointer p-0 w-10 h-10 rounded-full grid place-items-center hover:bg-[#cbd5e1] transition-colors max-[980px]:row-start-3 max-[980px]:col-start-4 max-[980px]:justify-self-end max-[980px]:self-center max-[980px]:mb-1;
}

.expand-btn-expanded {
  @apply bg-[#e0f2fe];
}

.expand-btn-icon {
  @apply h-6 w-6 transition-transform;
}

.expanded-panel {
  @apply border-2 border-t-0 border-[#0ea5e9] rounded-b-2xl bg-[#f8fafc] shadow-[0_12px_24px_rgba(15,23,42,0.08)] px-4 pb-4 pt-0.5 max-[980px]:px-3 max-[980px]:pb-3 max-[980px]:pt-0.5 mt-[-12px] mb-[14px];
}

.expanded-separator {
  @apply -mx-4 max-[980px]:-mx-3 mb-2 border-t-2 border-[#edf1f7];
}

.expanded-title {
  @apply mb-4 mt-2 ml-1 text-[#64748b] text-[0.75rem] tracking-[1px] font-bold;
}

.activities-scroll {
  @apply overflow-x-auto -mx-4 max-[980px]:-mx-3 px-4 max-[980px]:px-3;
}

.activities-header {
  @apply grid [grid-template-columns:minmax(0,3.6fr)_minmax(110px,0.9fr)_90px_70px] items-center gap-3 px-3 py-2.5 text-[#64748b] text-[0.75rem] tracking-[0.7px] font-bold border-b border-[#cbd5e1] min-w-[600px];
}

.activity-row {
  @apply grid [grid-template-columns:minmax(0,3.6fr)_minmax(110px,0.9fr)_90px_70px] items-center gap-3 px-3 py-2.5 border-t border-[#edf1f7] bg-slate-50 min-w-[600px];
}

.activity-row-first {
  @apply border-t-0;
}

.activity-title {
  @apply text-gray-900 text-[0.9rem] font-bold break-words min-w-0;
}

.activity-category {
  @apply inline-flex items-center bg-[#eef2f7] text-gray-600 rounded-full px-2.5 py-1 text-[0.78rem] font-semibold;
}

.activity-date {
  @apply text-gray-500 text-[0.84rem];
}

.activity-points {
  @apply text-[#0ea5e9] text-[0.92rem] font-extrabold text-right;
}
</style>
