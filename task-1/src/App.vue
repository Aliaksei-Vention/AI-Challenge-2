<template>
  <main class="min-h-screen pt-7 px-[18px] pb-9">
    <h1
      class="w-[min(1205px,100%)] mx-auto mt-2 mb-16 text-left text-[#0d1320] text-[36px] font-bold tracking-[0.2px]"
      style="font-family: Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;"
    >
      Exactly not a leaderboard
    </h1>
    <section class="w-[min(1205px,100%)] mx-auto p-[26px] bg-[#f8fafc]">
      <header>
        <h2
          class="m-0 text-gray-900 text-[30px] font-bold"
          style="font-family: Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;"
        >
          No way it is a leaderboard
        </h2>
        <p
          class="mt-2 mb-5 text-[#64748b] text-[14px] font-normal"
          style="font-family: Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;"
        >
          Not top people
        </p>
      </header>

      <Toolbar
        :model-value="filterState"
        :options="filterOptions"
        @update:modelValue="onFilterUpdate"
      />
      <Podium :performers="podiumPerformers" />
      <RankList :rows="rankRows" :recent-activities="filteredRecentActivities" />
    </section>
    <CommentsSection />
  </main>
</template>

<script setup>
import { computed, ref } from 'vue';
import Toolbar from './components/Toolbar.vue';
import Podium from './components/Podium.vue';
import RankList from './components/RankList.vue';
import CommentsSection from './components/CommentsSection.vue';
import performers from './data/performers.json';
import people from './data/detailedRanks.json';
import activities from './data/recentActivities.json';
import filterOptions from './data/filterOptions.json';

const filterState = ref({
  year: 'All years',
  quarter: 'All Quarters',
  category: 'All Categories',
  search: '',
});

const onFilterUpdate = (nextFilters) => {
  filterState.value = nextFilters;
};

const matchesSearch = (person) => {
  const search = filterState.value.search.trim().toLowerCase();
  if (!search) return true;

  const haystack = [
    person.firstName,
    person.lastName,
    person.role,
    person.department,
    person.title,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(search);
};

const visiblePeople = computed(() => {
  const selectedYear = filterState.value.year;
  return people.filter((person) => {
    if (selectedYear !== 'All years' && person.year !== selectedYear) return false;
    return matchesSearch(person);
  });
});

const filteredActivities = computed(() => {
  const selectedYear = filterState.value.year;
  const selectedQuarter = filterState.value.quarter;
  const selectedCategory = filterState.value.category;
  const visibleIds = new Set(visiblePeople.value.map((p) => p.id));

  return activities.filter((activity) => {
    if (!visibleIds.has(activity.personId)) return false;
    if (selectedYear !== 'All years' && activity.year !== selectedYear) return false;
    if (selectedQuarter !== 'All Quarters' && activity.quarter !== selectedQuarter) return false;
    if (selectedCategory !== 'All Categories' && activity.category !== selectedCategory) return false;
    return true;
  });
});

const totalsByPerson = computed(() => {
  const map = new Map();

  for (const person of visiblePeople.value) {
    map.set(person.id, { total: 0, achievements: new Map() });
  }

  for (const activity of filteredActivities.value) {
    const entry = map.get(activity.personId);
    if (!entry) continue;

    entry.total += activity.points;
    const achievementKey = `${activity.icon}::${activity.category || 'Uncategorized'}`;
    const prev = entry.achievements.get(achievementKey) || {
      icon: activity.icon,
      category: activity.category || 'Uncategorized',
      count: 0,
    };
    prev.count += 1;
    entry.achievements.set(achievementKey, prev);
  }

  return map;
});

const rankRows = computed(() => {
  const rows = visiblePeople.value.map((person) => {
    const stats = totalsByPerson.value.get(person.id) || { total: 0, achievements: new Map() };
    const achievements = [...stats.achievements.values()].map(({ icon, count, category }) => ({
      icon,
      count,
      category,
    }));

    return {
      ...person,
      total: stats.total,
      achievements,
    };
  });

  const scoredRows = rows.filter((row) => row.total > 0);

  scoredRows.sort((a, b) => b.total - a.total || a.lastName.localeCompare(b.lastName));

  return scoredRows.map((row, idx) => ({ ...row, rank: idx + 1 }));
});

const podiumPerformers = computed(() => {
  const rankToOrderClass = {
    1: 'order-2 max-[980px]:order-none',
    2: 'order-1 max-[980px]:order-none',
    3: 'order-3 max-[980px]:order-none',
  };

  const fallbackByRank = {
    1: {
      ringClass: 'bg-[#fbbf24]',
      badgeClass: 'right-[-4px] bottom-[-2px] bg-[#eab308]',
      scoreClass: 'bg-[#fef9c3] text-[#ca8a04] border-[#fde047] border-[1px]',
      starClass: 'text-[#ca8a04]',
    },
    2: {
      ringClass: 'bg-[#fff]',
      badgeClass: 'right-[-4px] bottom-[-2px] bg-[#94a3b8]',
      scoreClass: 'bg-[#fff] text-[#0ea5e9] border-[#e2e8f0] border-[1px]',
      starClass: 'text-[#0ea5e9]',
    },
    3: {
      ringClass: 'bg-[#fff]',
      badgeClass: 'right-[-4px] bottom-[-2px] bg-[#92400e]',
      scoreClass: 'bg-[#fff] text-[#0ea5e9] border-[#e2e8f0] border-[1px]',
      starClass: 'text-[#0ea5e9]',
    },
  };

  return rankRows.value.slice(0, 3).map((row) => {
    const base = performers.find((p) => p.firstName === row.firstName && p.lastName === row.lastName);
    const fallback = fallbackByRank[row.rank] || fallbackByRank[3];

    return {
      ...base,
      ...fallback,
      ...row,
      rank: row.rank,
      score: String(row.total),
      orderClass: rankToOrderClass[row.rank] || 'order-none',
    };
  });
});

const filteredRecentActivities = computed(() => {
  return filteredActivities.value
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((a) => ({
      personId: a.personId,
      title: `[${a.category}] ${a.title}`,
      category: a.category,
      date: a.dateLabel,
      points: `+${a.points}`,
    }));
});
</script>
