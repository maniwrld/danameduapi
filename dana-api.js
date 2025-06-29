const axios = require('axios');
const CryptoJS = require('crypto-js');

const API_BASE_URL = 'https://dana.medu.ir/core-api/v1';
const SERVICE_ID = 'dana.medu.ir';

class ReportCard {
    constructor(rawData) {
        this.rawData = rawData;
        this.studentInfo = rawData.user?.[0] || {};
        this.courses = rawData.courses || [];
    }

    getStudentFullName() {
        return `${this.studentInfo.firstname || ''} ${this.studentInfo.lastname || ''}`.trim();
    }

    getNationalCode() {
        return this.studentInfo.nationalcode || 'N/A';
    }

    getSchoolName() {
        return this.studentInfo.school_name || 'N/A';
    }

    getGrades() {
        return this.courses.map(course => ({
            title: course.course_title.trim(),
            finalGrade: course.nimeh2_final !== null ? parseFloat(course.nimeh2_final) : null,
            midTermGrade: course.mostamar2 !== null ? parseFloat(course.mostamar2) : null,
            history: this._parseSteps(course.steps),
        }));
    }

    calculateGPA() {
        const gradedCourses = this.getGrades().filter(c => c.finalGrade !== null && !isNaN(c.finalGrade));
        if (gradedCourses.length === 0) {
            return null;
        }
        const totalPoints = gradedCourses.reduce((sum, course) => sum + course.finalGrade, 0);
        return parseFloat((totalPoints / gradedCourses.length).toFixed(2));
    }

    _parseSteps(steps) {
        if (!Array.isArray(steps)) {
            return [];
        }
        return steps.map(step => ({
            by: step.by,
            date: new Date(step.cr),
            action: step.what_did_we_do,
        }));
    }
}

class DanaClient {
    constructor({ cookie, clientId, username }) {
        if (!cookie || !clientId) {
            throw new Error('Cookie and ClientId are required for initialization.');
        }
        this.cookie = cookie;
        this.clientId = clientId;
        this.username = username;
        this.secretKey = this._getSecretKey();
    }

    _getSecretKey() {
        const fallback = "ligb4vl6-yxqup1ql-uw5by2ae-79f39sg5-90ni9hwp";
        const id = this.clientId || fallback;
        return id.split("-").sort().join("%");
    }

    _decrypt(encryptedToken) {
        try {
            const decrypted = CryptoJS.AES.decrypt(encryptedToken, this.secretKey);
            const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
            if (!decryptedText) throw new Error("Decryption resulted in an empty string.");
            return JSON.parse(JSON.parse(decryptedText));
        } catch (e) {
            throw new Error(`Decryption failed: ${e.message}`);
        }
    }

    async _post(key, params = {}) {
        const url = `${API_BASE_URL}/data-provider/get-data-source`;
        const payload = { serviceId: SERVICE_ID, key, params };
        const headers = {
            "accept": "application/json, text/plain, */*",
            "client-id": this.clientId,
            "content-type": "application/json; charset=UTF-8",
            "cookie": this.cookie,
        };

        try {
            const response = await axios.post(url, payload, { headers });
            const data = response.data;

            if (data && data.token) {
                const decryptedData = this._decrypt(data.token);
                return decryptedData.Result || decryptedData;
            }
            return data.Result || data;
        } catch (error) {
            const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
            throw new Error(`API call for key '${key}' failed: ${errorMessage}`);
        }
    }

    async getReportCard(implPath) {
        if (!implPath) throw new Error("implPath is required.");
        const rawData = await this._post("finalMedu/user/final-report-card", { implPath });
        return new ReportCard(rawData);
    }
}

module.exports = { DanaClient, ReportCard };
