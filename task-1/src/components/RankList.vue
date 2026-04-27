<template>
  <section class="rank-list" aria-label="Detailed ranked list">
    <div class="rank-list-inner">
      <template v-for="row in rows" :key="row.rank">
        <RankRow
          :row="row"
          :isExpanded="isExpandedRow(row.rank)"
          :recentActivities="getRecentActivitiesForRow(row)"
          @toggle="toggleRow"
        />
      </template>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import RankRow from './RankRow.vue';

const props = defineProps({
  rows: {
    type: Array,
    required: true,
  },
  recentActivities: {
    type: Array,
    required: true,
  },
});

const expandedRank = ref(null);

const toggleRow = (rank) => {
  expandedRank.value = expandedRank.value === rank ? null : rank;
};

const isExpandedRow = (rank) => expandedRank.value === rank;

const getRecentActivitiesForRow = (row) => {
  return (row?.id && Array.isArray(props.recentActivities))
    ? props.recentActivities.filter((activity) => activity.personId === row.id)
    : [];
};
</script>

<style scoped>
.rank-list {
  @apply mt-20;
}

.rank-list-inner {
  @apply -m-2 rounded-[14px] p-2 overflow-visible;
}
</style>
