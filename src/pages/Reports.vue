<template>
    <div class="container-fluid py-3 px-md-4">
        <!-- عنوان صفحه -->
        <div class="d-flex justify-content-between align-items-center mb-4 no-print">
            <h1 class="h2 mb-0 text-white fw-bold">
                <font-awesome-icon icon="chart-bar" class="me-2 text-primary" />
                SLA & Uptime Reports
            </h1>
        </div>

        <!-- فیلترها (کارت بومی Uptime Kuma) -->
        <div class="shadow-box mb-4 no-print p-4">
            <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary border-opacity-25">
                <span class="fw-bold text-light">Filter Criteria</span>
                <div class="btn-group btn-group-sm">
                    <button type="button" class="btn btn-outline-secondary" @click="setDateRange(7)">Last 7 Days</button>
                    <button type="button" class="btn btn-outline-secondary" @click="setDateRange(30)">Last 30 Days</button>
                    <button type="button" class="btn btn-outline-secondary" @click="setDateRange(90)">Last 90 Days</button>
                </div>
            </div>

            <form @submit.prevent="fetchReport" class="row g-3 align-items-end">
                <div class="col-md-4">
                    <label class="form-label text-muted small fw-bold">SELECT MONITOR</label>
                    <select v-model="form.monitorId" class="form-select kuma-input" required>
                        <option value="" disabled>Choose a monitor...</option>
                        <option v-for="m in monitorList" :key="m.id" :value="m.id">
                            {{ m.name }}
                        </option>
                    </select>
                </div>

                <div class="col-md-3">
                    <label class="form-label text-muted small fw-bold">START DATE</label>
                    <input 
                        type="date" 
                        v-model="form.startDate" 
                        class="form-control kuma-input date-picker-input" 
                        @click="$event.target.showPicker && $event.target.showPicker()"
                        required 
                    />
                </div>

                <div class="col-md-3">
                    <label class="form-label text-muted small fw-bold">END DATE</label>
                    <input 
                        type="date" 
                        v-model="form.endDate" 
                        class="form-control kuma-input date-picker-input" 
                        @click="$event.target.showPicker && $event.target.showPicker()"
                        required 
                    />
                </div>

                <div class="col-md-2">
                    <button type="submit" class="btn btn-kuma-primary w-100" :disabled="loading">
                        <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
                        <span v-else>Generate</span>
                    </button>
                </div>
            </form>
        </div>

        <!-- محتوای گزارش -->
        <div v-if="reportData" class="printable-area">
            <!-- مشخصات مانیتور و دکمه‌های دانلود -->
            <div class="shadow-box p-4 mb-4">
                <div class="d-flex flex-wrap justify-content-between align-items-center">
                    <div>
                        <h2 class="mb-1 text-primary fw-bold">{{ reportData.monitorName }}</h2>
                        <div class="text-muted small">
                            <span class="me-3">{{ reportData.monitorUrl }}</span>
                            <span>Period: <strong>{{ reportData.startDate }}</strong> to <strong>{{ reportData.endDate }}</strong></span>
                        </div>
                    </div>
                    <div class="no-print d-flex gap-2 mt-3 mt-md-0">
                        <button @click="downloadExcel" class="btn btn-outline-success fw-bold px-3" :disabled="downloadingExcel">
                            <span v-if="downloadingExcel" class="spinner-border spinner-border-sm me-1"></span>
                            <span v-else>📊 Download Excel</span>
                        </button>
                        <button @click="printPdf" class="btn btn-outline-danger fw-bold px-3">
                            📄 Save PDF
                        </button>
                    </div>
                </div>
            </div>

            <!-- کارت‌های آمار ۴ گانه -->
            <div class="row g-3 mb-4">
                <div class="col-md-3">
                    <div class="shadow-box text-center p-4">
                        <span class="text-muted small fw-bold">UPTIME (SLA)</span>
                        <h2 class="mt-2 mb-0 fw-bold" :class="reportData.uptimePercent >= 99 ? 'text-success' : 'text-danger'">
                            {{ reportData.uptimePercent }}%
                        </h2>
                    </div>
                </div>

                <div class="col-md-3">
                    <div class="shadow-box text-center p-4">
                        <span class="text-muted small fw-bold">TOTAL OUTAGES</span>
                        <h2 class="mt-2 mb-0 fw-bold text-white">{{ reportData.outageCount }}</h2>
                    </div>
                </div>

                <div class="col-md-3">
                    <div class="shadow-box text-center p-4">
                        <span class="text-muted small fw-bold">TOTAL DOWNTIME</span>
                        <h2 class="mt-2 mb-0 fw-bold text-warning">{{ reportData.totalDowntimeMinutes }} <span class="fs-6">Min</span></h2>
                    </div>
                </div>

                <div class="col-md-3">
                    <div class="shadow-box text-center p-4">
                        <span class="text-muted small fw-bold">AVG LATENCY</span>
                        <h2 class="mt-2 mb-0 fw-bold text-info">{{ reportData.avgPing }} <span class="fs-6">ms</span></h2>
                    </div>
                </div>
            </div>

            <!-- جدول رخدادها و قطعی‌ها -->
            <div class="shadow-box p-0 overflow-hidden mb-5">
                <div class="p-3 border-bottom border-secondary border-opacity-25">
                    <h5 class="mb-0 text-white fw-bold">Incidents Log</h5>
                </div>
                <div class="table-responsive">
                    <table class="table kuma-table mb-0">
                        <thead>
                            <tr>
                                <th>Start Time</th>
                                <th>End Time</th>
                                <th>Duration</th>
                                <th>Error / Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="reportData.incidents.length === 0">
                                <td colspan="4" class="text-center py-4 text-success fw-bold">
                                    ✔ No incidents recorded during this period! 100% stable.
                                </td>
                            </tr>
                            <tr v-for="(inc, idx) in reportData.incidents" :key="idx">
                                <td class="text-light">{{ inc.start }}</td>
                                <td class="text-light">{{ inc.end }}</td>
                                <td><span class="badge bg-danger rounded-pill">{{ inc.durationMinutes }} Mins</span></td>
                                <td class="text-danger">{{ inc.reason }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import axios from "axios";
import dayjs from "dayjs";

export default {
    data() {
        return {
            loading: false,
            downloadingExcel: false,
            form: {
                monitorId: "",
                startDate: dayjs().subtract(30, "day").format("YYYY-MM-DD"),
                endDate: dayjs().format("YYYY-MM-DD")
            },
            reportData: null
        };
    },
    computed: {
        monitorList() {
            return Object.values(this.$root.monitorList || {});
        }
    },
    methods: {
        setDateRange(days) {
            this.form.startDate = dayjs().subtract(days, "day").format("YYYY-MM-DD");
            this.form.endDate = dayjs().format("YYYY-MM-DD");
        },

        async fetchReport() {
            this.loading = true;
            try {
                const res = await axios.get("/api/reports/data", {
                    params: {
                        monitorId: this.form.monitorId,
                        startDate: `${this.form.startDate} 00:00:00`,
                        endDate: `${this.form.endDate} 23:59:59`
                    }
                });
                if (res.data.ok) {
                    this.reportData = res.data.data;
                }
            } catch (err) {
                alert("Failed to load report: " + (err.response?.data?.msg || err.message));
            } finally {
                this.loading = false;
            }
        },

        async downloadExcel() {
            this.downloadingExcel = true;
            try {
                const res = await axios.get("/api/reports/export/excel", {
                    params: {
                        monitorId: this.form.monitorId,
                        startDate: `${this.form.startDate} 00:00:00`,
                        endDate: `${this.form.endDate} 23:59:59`
                    },
                    responseType: "blob"
                });

                const blob = new Blob([res.data], {
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                });
                const link = document.createElement("a");
                link.href = window.URL.createObjectURL(blob);
                link.download = `SLA_Report_${this.reportData.monitorName}_${this.form.startDate}.xlsx`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (err) {
                alert("Failed to download Excel file: " + err.message);
            } finally {
                this.downloadingExcel = false;
            }
        },

        printPdf() {
            window.print();
        }
    }
};
</script>

<style scoped>
/* استفاده از دکمه کپسولی سبز اصلی Kuma (عین دکمه Add New Monitor) */
.btn-kuma-primary {
    background-color: #5cdd8b !important;
    color: #000 !important;
    border-radius: 50rem !important;
    font-weight: bold;
    padding: 8px 18px;
    border: none;
    transition: all 0.2s;
}

.btn-kuma-primary:hover {
    filter: brightness(1.1);
    transform: scale(1.02);
}

/* اینپوت‌های تاریک منطبق بر دشبورد */
.kuma-input {
    background-color: #0d1117 !important;
    border: 1px solid #30363d !important;
    color: #e6edf3 !important;
    border-radius: 50rem !important;
    padding: 8px 16px;
}

.kuma-input:focus {
    border-color: #5cdd8b !important;
    box-shadow: 0 0 0 2px rgba(92, 221, 139, 0.2) !important;
}

/* تقویم دارک */
.date-picker-input {
    color-scheme: dark;
    cursor: pointer;
}

.date-picker-input::-webkit-calendar-picker-indicator {
    filter: invert(1);
    cursor: pointer;
    opacity: 0.8;
}

/* جدول تاریک تمیز */
.kuma-table {
    background-color: transparent !important;
    color: #c9d1d9 !important;
}

.kuma-table thead th {
    background-color: #0d1117 !important;
    color: #8b949e !important;
    border-bottom: 1px solid #30363d !important;
    padding: 14px 18px;
}

.kuma-table tbody td {
    border-bottom: 1px solid #21262d !important;
    padding: 14px 18px;
    vertical-align: middle;
}
</style>