<template>
    <div class="shadow-box mb-3 p-0" :style="boxStyle">
        <div class="list-header">
            <!-- Line 1: Checkbox + Status + Tags + Search Bar -->
            <div class="filter-row">
                <div class="search-wrapper">
                    <a v-if="searchText != ''" class="search-icon" @click="clearSearchText">
                        <font-awesome-icon icon="times" />
                    </a>
                    <form @submit.prevent>
                        <input
                            v-model="searchText"
                            class="form-control search-input"
                            :placeholder="$t('Search...')"
                            :aria-label="$t('Search monitored sites')"
                            autocomplete="off"
                        />
                    </form>
                </div>

                <div class="filters-group">
                    <!-- چک‌باکس انتخاب چندتایی مانیتورها: فقط برای Admin و Editor -->
                    <template v-if="$root.userRole !== 'viewer'">
                        <input
                            v-if="!selectMode"
                            v-model="selectMode"
                            class="form-check-input"
                            type="checkbox"
                            :aria-label="$t('selectAllMonitorsAria')"
                            @change="selectAll = selectMode"
                        />
                        <input
                            v-else
                            v-model="selectAll"
                            class="form-check-input"
                            type="checkbox"
                            :aria-label="selectAll ? $t('deselectAllMonitorsAria') : $t('selectAllMonitorsAria')"
                        />
                    </template>

                    <MonitorListFilter
                        :filterState="filterState"
                        :allCollapsed="allGroupsCollapsed"
                        :hasGroups="groupMonitors.length >= 2"
                        @update-filter="updateFilter"
                        @toggle-collapse-all="toggleCollapseAll"
                    />
                </div>
            </div>

            <!-- Line 2: Cancel + Actions (عملیات گروهی: فقط برای غیر Viewer) -->
            <div v-if="$root.userRole !== 'viewer' && selectMode && selectedMonitorCount > 0" class="selection-row">
                <button class="btn btn-outline-normal" @click="cancelSelectMode">
                    {{ $t("Cancel") }}
                </button>
                <div class="actions-wrapper">
                    <div class="dropdown">
                        <button
                            class="btn btn-outline-normal dropdown-toggle"
                            type="button"
                            data-bs-toggle="dropdown"
                            :aria-label="$t('Actions')"
                            :disabled="bulkActionInProgress"
                            aria-expanded="false"
                        >
                            {{ $t("Actions") }}
                        </button>
                        <ul class="dropdown-menu">
                            <li>
                                <a class="dropdown-item" href="#" @click.prevent="pauseDialog">
                                    <font-awesome-icon icon="pause" class="me-2" />
                                    {{ $t("Pause") }}
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item" href="#" @click.prevent="resumeSelected">
                                    <font-awesome-icon icon="play" class="me-2" />
                                    {{ $t("Resume") }}
                                </a>
                            </li>
                            <li>
                                <a
                                    class="dropdown-item text-danger"
                                    href="#"
                                    @click.prevent="$refs.confirmDelete.show()"
                                >
                                    <font-awesome-icon icon="trash" class="me-2" />
                                    {{ $t("Delete") }}
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
                <span class="selected-count">
                    {{ $t("selectedMonitorCountMsg", selectedMonitorCount) }}
                </span>
            </div>
        </div>
        <div
            ref="monitorList"
            class="monitor-list px-2"
            :class="{ scrollbar: scrollbar }"
            :style="monitorListStyle"
            data-testid="monitor-list"
        >
            <div v-if="Object.keys($root.monitorList).length === 0" class="text-center mt-3">
                {{ $t("No Monitors") }}<span v-if="$root.userRole !== 'viewer'">, please <router-link to="/add">{{ $t("add one") }}</router-link></span>
            </div>

            <MonitorListItem
                v-for="item in sortedMonitorList"
                :key="`${item.id}-${collapseKey}`"
                :monitor="item"
                :isSelectMode="selectMode"
                :isSelected="isSelected"
                :select="select"
                :deselect="deselect"
                :filter-func="filterFunc"
                :sort-func="sortFunc"
            />
        </div>
    </div>

    <Confirm ref="confirmPause" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="pauseSelected">
        {{ $t("pauseMonitorMsg") }}
    </Confirm>

    <Confirm ref="confirmDelete" btn-style="btn-danger" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="deleteSelected">
        {{ $t("deleteMonitorsMsg") }}
    </Confirm>
</template>

<script>
import Confirm from "../components/Confirm.vue";
import MonitorListItem from "../components/MonitorListItem.vue";
import MonitorListFilter from "./MonitorListFilter.vue";
import { getMonitorRelativeURL } from "../util.ts";

export default {
    components: {
        Confirm,
        MonitorListItem,
        MonitorListFilter,
    },
    props: {
        scrollbar: {
            type: Boolean,
        },
    },
    data() {
        return {
            searchText: "",
            selectMode: false,
            selectAll: false,
            disableSelectAllWatcher: false,
            selectedMonitors: {},
            windowTop: 0,
            bulkActionInProgress: false,
            filterState: {
                status: null,
                active: null,
                tags: null,
            },
            collapseKey: 0,
        };
    },
    computed: {
        boxStyle() {
            if (window.innerWidth > 550) {
                return {
                    height: `calc(100vh - 160px + ${this.windowTop}px)`,
                };
            } else {
                return {
                    height: "calc(100vh - 160px)",
                };
            }
        },

        sortedMonitorList() {
            let result = Object.values(this.$root.monitorList);

            result = result.filter((monitor) => {
                if (monitor.parent !== null) {
                    return false;
                }
                return true;
            });

            result = result.filter(this.filterFunc);

            result.sort(this.sortFunc);

            return result;
        },

        isDarkTheme() {
            return document.body.classList.contains("dark");
        },

        monitorListStyle() {
            let listHeaderHeight = 58 + 10;

            if (this.selectMode && this.selectedMonitorCount > 0) {
                listHeaderHeight += 42;
            }

            return {
                height: `calc(100% - ${listHeaderHeight}px)`,
            };
        },

        selectedMonitorCount() {
            return Object.keys(this.selectedMonitors).length;
        },

        filtersActive() {
            return (
                this.filterState.status != null ||
                this.filterState.active != null ||
                this.filterState.tags != null ||
                this.searchText !== ""
            );
        },

        groupMonitors() {
            const monitors = Object.values(this.$root.monitorList);
            return monitors.filter((m) => m.type === "group" && monitors.some((child) => child.parent === m.id));
        },

        allGroupsCollapsed() {
            if (this.collapseKey < 0 || this.groupMonitors.length === 0) {
                return true;
            }

            const storage = window.localStorage.getItem("monitorCollapsed");
            if (storage === null) {
                return true;
            }

            const storageObject = JSON.parse(storage);
            return this.groupMonitors.every((group) => storageObject[`monitor_${group.id}`] !== false);
        },
    },
    watch: {
        searchText() {
            for (let monitor of this.sortedMonitorList) {
                if (!this.selectedMonitors[monitor.id]) {
                    if (this.selectAll) {
                        this.disableSelectAllWatcher = true;
                        this.selectAll = false;
                    }
                    break;
                }
            }
        },
        selectAll() {
            if (!this.disableSelectAllWatcher) {
                this.selectedMonitors = {};

                if (this.selectAll) {
                    this.sortedMonitorList.forEach((item) => {
                        this.selectedMonitors[item.id] = true;
                    });
                } else {
                    this.selectMode = false;
                }
            } else {
                this.disableSelectAllWatcher = false;
            }
        },
        selectMode() {
            if (!this.selectMode) {
                this.selectAll = false;
                this.selectedMonitors = {};
            }
        },
    },
    mounted() {
        window.addEventListener("scroll", this.onScroll);
    },
    beforeUnmount() {
        window.removeEventListener("scroll", this.onScroll);
    },
    methods: {
        onScroll() {
            if (window.top.scrollY <= 133) {
                this.windowTop = window.top.scrollY;
            } else {
                this.windowTop = 133;
            }
        },
        monitorURL(id) {
            return getMonitorRelativeURL(id);
        },
        clearSearchText() {
            this.searchText = "";
        },
        updateFilter(newFilter) {
            this.filterState = newFilter;
        },
        toggleCollapseAll() {
            const shouldCollapse = !this.allGroupsCollapsed;

            let storageObject = {};
            const storage = window.localStorage.getItem("monitorCollapsed");
            if (storage !== null) {
                storageObject = JSON.parse(storage);
            }

            this.groupMonitors.forEach((group) => {
                storageObject[`monitor_${group.id}`] = shouldCollapse;
            });

            window.localStorage.setItem("monitorCollapsed", JSON.stringify(storageObject));

            if (shouldCollapse) {
                const currentMonitorId = parseInt(this.$route.params.id);
                const currentMonitor = this.$root.monitorList[currentMonitorId];

                if (currentMonitor && currentMonitor.parent !== null) {
                    let rootParentId = currentMonitor.parent;
                    let rootParent = this.$root.monitorList[rootParentId];

                    while (rootParent && rootParent.parent !== null) {
                        rootParentId = rootParent.parent;
                        rootParent = this.$root.monitorList[rootParentId];
                    }

                    this.$router.push(getMonitorRelativeURL(rootParentId)).finally(() => {
                        this.collapseKey++;
                    });
                    return;
                }
            }

            this.collapseKey++;
        },
        deselect(id) {
            delete this.selectedMonitors[id];
        },
        select(id) {
            this.selectedMonitors[id] = true;
        },
        isSelected(id) {
            return id in this.selectedMonitors;
        },
        cancelSelectMode() {
            this.selectMode = false;
            this.selectedMonitors = {};
        },
        pauseDialog() {
            this.$refs.confirmPause.show();
        },
        pauseSelected() {
            if (this.bulkActionInProgress) {
                return;
            }

            const activeMonitors = Object.keys(this.selectedMonitors).filter((id) => this.$root.monitorList[id].active);

            if (activeMonitors.length === 0) {
                this.$root.toastError(this.$t("noMonitorsPausedMsg"));
                return;
            }

            this.bulkActionInProgress = true;
            activeMonitors.forEach((id) => this.$root.getSocket().emit("pauseMonitor", id, () => {}));
            this.$root.toastSuccess(this.$t("pausedMonitorsMsg", activeMonitors.length));
            this.bulkActionInProgress = false;
            this.cancelSelectMode();
        },
        resumeSelected() {
            if (this.bulkActionInProgress) {
                return;
            }

            const inactiveMonitors = Object.keys(this.selectedMonitors).filter(
                (id) => !this.$root.monitorList[id].active
            );

            if (inactiveMonitors.length === 0) {
                this.$root.toastError(this.$t("noMonitorsResumedMsg"));
                return;
            }

            this.bulkActionInProgress = true;
            inactiveMonitors.forEach((id) => this.$root.getSocket().emit("resumeMonitor", id, () => {}));
            this.$root.toastSuccess(this.$t("resumedMonitorsMsg", inactiveMonitors.length));
            this.bulkActionInProgress = false;
            this.cancelSelectMode();
        },
        async deleteSelected() {
            if (this.bulkActionInProgress) {
                return;
            }

            const monitorIds = Object.keys(this.selectedMonitors);

            this.bulkActionInProgress = true;
            let successCount = 0;
            let errorCount = 0;

            for (const id of monitorIds) {
                try {
                    await new Promise((resolve, reject) => {
                        this.$root.getSocket().emit("deleteMonitor", id, false, (res) => {
                            if (res.ok) {
                                successCount++;
                                resolve();
                            } else {
                                errorCount++;
                                reject();
                            }
                        });
                    });
                } catch (error) {
                    // Handled
                }
            }

            this.bulkActionInProgress = false;

            if (successCount > 0) {
                this.$root.toastSuccess(this.$t("deletedMonitorsMsg", successCount));
            }
            if (errorCount > 0) {
                this.$root.toastError(this.$t("bulkDeleteErrorMsg", errorCount));
            }

            this.cancelSelectMode();
        },
        filterFunc(monitor) {
            if (monitor.type === "group") {
                const children = Object.values(this.$root.monitorList).filter((m) => m.parent === monitor.id);
                if (children.some((child, index, children) => this.filterFunc(child))) {
                    return true;
                }
            }

            let searchTextMatch = true;
            if (this.searchText !== "") {
                const loweredSearchText = this.searchText.toLowerCase();
                searchTextMatch =
                    monitor.name.toLowerCase().includes(loweredSearchText) ||
                    monitor.tags.find(
                        (tag) =>
                            tag.name.toLowerCase().includes(loweredSearchText) ||
                            tag.value?.toLowerCase().includes(loweredSearchText)
                    );
            }

            let statusMatch = true;
            if (this.filterState.status != null && this.filterState.status.length > 0) {
                if (monitor.id in this.$root.lastHeartbeatList && this.$root.lastHeartbeatList[monitor.id]) {
                    monitor.status = this.$root.lastHeartbeatList[monitor.id].status;
                }
                statusMatch = this.filterState.status.includes(monitor.status);
            }

            let activeMatch = true;
            if (this.filterState.active != null && this.filterState.active.length > 0) {
                activeMatch = this.filterState.active.includes(monitor.active);
            }

            let tagsMatch = true;
            if (this.filterState.tags != null && this.filterState.tags.length > 0) {
                tagsMatch =
                    monitor.tags
                        .map((tag) => tag.tag_id)
                        .filter((monitorTagId) => this.filterState.tags.includes(monitorTagId)).length > 0;
            }

            return searchTextMatch && statusMatch && activeMatch && tagsMatch;
        },
        sortFunc(m1, m2) {
            if (m1.active !== m2.active) {
                if (m1.active === false) {
                    return 1;
                }

                if (m2.active === false) {
                    return -1;
                }
            }

            if (m1.weight !== m2.weight) {
                if (m1.weight > m2.weight) {
                    return -1;
                }

                if (m1.weight < m2.weight) {
                    return 1;
                }
            }

            return m1.name.localeCompare(m2.name);
        },
    },
};
</script>

<style lang="scss" scoped>
@import "../assets/vars.scss";

.shadow-box {
    height: calc(100vh - 150px);
    position: sticky;
    top: 10px;
}

.small-padding {
    padding-left: 5px !important;
    padding-right: 5px !important;
}

.list-header {
    border-bottom: 1px solid #dee2e6;
    border-radius: 10px 10px 0 0;
    margin-bottom: 10px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;

    .dark & {
        background-color: $dark-header-bg;
        border-bottom: 0;
    }
}

.filter-row {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 8px;
    flex-wrap: nowrap;
    width: 100%;

    .form-check-input {
        cursor: pointer;
        margin: 0;
        margin-left: 6px;
        flex-shrink: 0;
    }
}

.filters-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.actions-wrapper {
    display: flex;
    align-items: center;

    .dropdown-toggle {
        white-space: nowrap;

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    .dropdown-menu {
        min-width: 140px;
        padding: 4px 0;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

        .dark & {
            background-color: $dark-bg;
            border-color: $dark-border-color;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
    }

    .dropdown-item {
        cursor: pointer;
        padding: 6px 12px;
        font-size: 0.9em;

        .dark & {
            color: $dark-font-color;

            &:hover {
                background-color: $dark-bg2;
                color: $dark-font-color;
            }
        }

        &.text-danger {
            color: #dc3545;

            .dark & {
                color: #dc3545;
            }

            &:hover {
                background-color: #dc3545 !important;
                color: white !important;

                .dark & {
                    background-color: #dc3545 !important;
                    color: white !important;
                }

                svg {
                    color: white !important;
                }
            }
        }
    }
}

.selection-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
}

.selected-count {
    white-space: nowrap;
    font-size: 0.9em;
    color: $primary;

    .dark & {
        color: $dark-font-color;
    }
}

.selection-controls {
    margin-top: 5px;
    display: flex;
    align-items: center;

    .d-flex {
        width: 100%;
    }

    .gap-2 {
        gap: 0.5rem;
    }

    .selected-count {
        margin-left: auto;
    }
}

@media (max-width: 975px) {
    .filter-row {
        flex-direction: column-reverse;
        align-items: stretch;
        gap: 8px;
    }

    .search-wrapper {
        width: 100% !important;
        max-width: 100% !important;
        margin-left: 0 !important;
        flex: 1 1 100%;
    }

    .filters-group {
        width: 100%;
    }
}

@media (max-width: 770px) {
    .list-header {
        margin-bottom: 10px;
        padding: 20px;
    }
}

.search-wrapper {
    display: flex;
    align-items: center;
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
    max-width: 300px;
    margin-left: auto;
    order: 1;

    form {
        width: 100%;
    }
}

.search-icon {
    position: absolute;
    right: 10px;
    color: #c0c0c0;
    cursor: pointer;
    transition: all ease-in-out 0.1s;
    z-index: 1;

    &:hover {
        opacity: 0.5;
    }
}

.search-input {
    width: 100%;
    padding-right: 30px;
    transition: none !important;
}

.tags {
    margin-top: 4px;
    padding-left: 67px;
    display: flex;
    flex-wrap: wrap;
    gap: 0;
}

@media (max-width: 549px), (min-width: 770px) and (max-width: 1149px), (min-width: 1200px) and (max-width: 1499px) {
    .selection-controls {
        .selected-count {
            margin-left: 0;
            width: 100%;
            margin-top: 0.25rem;
        }
    }
}
</style>