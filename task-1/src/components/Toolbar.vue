<template>
  <section class="toolbar-root">
      <label class="sr-only" for="year-filter">Year filter</label>
      <select
        id="year-filter"
        :value="modelValue.year"
        class="filter-select filter-control filter-year"
        @change="updateField('year', $event.target.value)"
      >
        <option v-for="year in options.years" :key="year" :value="year">{{ year }}</option>
      </select>

      <label class="sr-only" for="quarter-filter">Quarter filter</label>
      <select
        id="quarter-filter"
        :value="modelValue.quarter"
        class="filter-select filter-control filter-year"
        @change="updateField('quarter', $event.target.value)"
      >
        <option v-for="quarter in options.quarters" :key="quarter" :value="quarter">{{ quarter }}</option>
      </select>

      <label class="sr-only" for="category-filter">Category filter</label>
      <select
        id="category-filter"
        :value="modelValue.category"
        class="filter-select filter-control filter-category"
        @change="updateField('category', $event.target.value)"
      >
        <option v-for="category in options.categories" :key="category" :value="category">{{ category }}</option>
      </select>

    <label
      class="search-box"
      aria-label="Search employee"
    >
      <svg
        class="search-icon"
        :class="isSearchFocused ? 'w-0 opacity-0 -translate-x-2 ml-0 mr-0' : 'w-5 opacity-100 ml-3 mr-2 translate-x-0'"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        :value="modelValue.search"
        type="text"
        placeholder="Search employee..."
        class="search-input"
        :class="isSearchFocused ? 'pl-3' : 'pl-0'"
        @input="updateField('search', $event.target.value)"
        @focus="isSearchFocused = true"
        @blur="isSearchFocused = false"
      />
    </label>
  </section>
</template>

<script setup>
import { ref } from 'vue';

const isSearchFocused = ref(false);

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
  options: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue']);

const updateField = (field, value) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  });
};
</script>

<style scoped>
.toolbar-root {
  @apply flex items-center flex-wrap gap-3 mx-auto mb-6 max-w-[1200px] py-5 px-6 bg-white border border-[#e2e8f0] rounded-xl shadow-sm max-[640px]:flex-col max-[640px]:items-stretch;
}

.filter-control {
  @apply shadow-none m-0 px-3 py-0 bg-[#ebebed] border border-[#373737] rounded-[2px] h-9 text-[0.9rem] text-gray-900 max-[640px]:w-full;
}

.filter-year {
  @apply w-[17%] max-[640px]:w-full;
}

.filter-category {
  @apply w-[22%] max-[640px]:w-full;
}

.filter-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  padding-right: 2.1rem;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23373737' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 6l5 5 5-5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-size: 14px 14px;
  background-position: right 10px center;
}

.search-box {
  @apply shadow-none m-0 px-0 py-0 bg-[#ebebed] border border-[#373737] rounded-[2px] flex h-9 leading-10 relative overflow-hidden items-center flex-1 max-[640px]:w-full max-[640px]:flex-none;
}

.search-icon {
  @apply h-5 flex-shrink-0 text-gray-600 transition-all duration-200;
}

.search-input {
  @apply border-none outline-none bg-transparent flex-grow text-gray-900 text-[0.9rem] py-2 pr-3 transition-all duration-200;
  font: inherit;
}
</style>
