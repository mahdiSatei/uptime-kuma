// server/services/report-service.js
const { R } = require("redbean-node");
const ExcelJS = require("exceljs");
const dayjs = require("dayjs");

class ReportService {
    /**
     * استخراج داده‌ها و محاسبه آمار SLA
     */
    static async generateReportData(monitorId, startDate, endDate) {
        monitorId = parseInt(monitorId, 10);

        // دریافت اطلاعات مانیتور از طریق RedBean
        const monitor = await R.findOne("monitor", "id = ?", [monitorId]);
        if (!monitor) {
            throw new Error(`Monitor with ID ${monitorId} not found`);
        }

        // استفاده از knex داخلی RedBean
        const heartbeats = await R.knex("heartbeat")
            .where("monitor_id", monitorId)
            .whereBetween("time", [startDate, endDate])
            .orderBy("time", "asc");

        const totalChecks = heartbeats.length;
        if (totalChecks === 0) {
            return {
                monitorName: monitor.name,
                monitorUrl: monitor.url || monitor.hostname || "-",
                startDate,
                endDate,
                uptimePercent: 100,
                avgPing: 0,
                outageCount: 0,
                totalDowntimeMinutes: 0,
                incidents: []
            };
        }

        let upChecks = 0;
        let pingSum = 0;
        let pingCount = 0;
        const incidents = [];
        let currentIncident = null;

        for (let i = 0; i < heartbeats.length; i++) {
            const hb = heartbeats[i];

            if (hb.status === 1) {
                upChecks++;
                if (hb.ping !== null && hb.ping > 0) {
                    pingSum += hb.ping;
                    pingCount++;
                }
                // پایان قطعی در صورت برگشت وضعیت به UP
                if (currentIncident) {
                    currentIncident.end = hb.time;
                    currentIncident.durationMinutes = Math.max(1, dayjs(hb.time).diff(dayjs(currentIncident.start), "minute"));
                    incidents.push(currentIncident);
                    currentIncident = null;
                }
            } else if (hb.status === 0) {
                // شروع قطعی جدید
                if (!currentIncident) {
                    currentIncident = {
                        start: hb.time,
                        end: null,
                        durationMinutes: 0,
                        reason: hb.msg || "Service Unavailable"
                    };
                }
            }
        }

        // در صورتی که تا انتهای بازه هنوز وضعیت Down باشد
        if (currentIncident) {
            currentIncident.end = endDate;
            currentIncident.durationMinutes = Math.max(1, dayjs(endDate).diff(dayjs(currentIncident.start), "minute"));
            incidents.push(currentIncident);
        }

        const uptimePercent = ((upChecks / totalChecks) * 100).toFixed(3);
        const avgPing = pingCount > 0 ? Math.round(pingSum / pingCount) : 0;
        const totalDowntimeMinutes = incidents.reduce((acc, curr) => acc + curr.durationMinutes, 0);

        return {
            monitorName: monitor.name,
            monitorUrl: monitor.url || monitor.hostname || "-",
            startDate,
            endDate,
            uptimePercent: parseFloat(uptimePercent),
            avgPing,
            outageCount: incidents.length,
            totalDowntimeMinutes,
            incidents
        };
    }

    /**
     * ساخت فایل اکسل
     */
    static async generateExcel(data) {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Uptime Kuma";

        // برگه ۱: خلاصه SLA
        const summarySheet = workbook.addWorksheet("SLA Summary");
        summarySheet.columns = [
            { header: "Metric", key: "metric", width: 30 },
            { header: "Value", key: "value", width: 40 },
        ];

        summarySheet.addRows([
            { metric: "Monitor Name", value: data.monitorName },
            { metric: "Target URL / Host", value: data.monitorUrl },
            { metric: "Reporting Period", value: `${data.startDate} to ${data.endDate}` },
            { metric: "SLA / Uptime Percentage", value: `${data.uptimePercent}%` },
            { metric: "Average Latency", value: `${data.avgPing} ms` },
            { metric: "Total Outages", value: data.outageCount },
            { metric: "Total Downtime Duration", value: `${data.totalDowntimeMinutes} Minutes` },
        ]);

        summarySheet.getRow(1).font = { bold: true };

        // برگه ۲: گزارش قطعی‌ها
        const incidentsSheet = workbook.addWorksheet("Outages Log");
        incidentsSheet.columns = [
            { header: "Start Time", key: "start", width: 22 },
            { header: "End Time", key: "end", width: 22 },
            { header: "Duration (Mins)", key: "duration", width: 18 },
            { header: "Error Message / Cause", key: "reason", width: 50 },
        ];

        data.incidents.forEach(inc => {
            incidentsSheet.addRow({
                start: inc.start,
                end: inc.end,
                duration: inc.durationMinutes,
                reason: inc.reason
            });
        });

        incidentsSheet.getRow(1).font = { bold: true };

        return workbook;
    }
}

module.exports = ReportService;