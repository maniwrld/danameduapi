const { DanaClient } = require('./dana-api.js');
const chalk = require('chalk');

// --- CONFIGURATION ---
const credentials = {   
    cookie: "REPLACE_WITH_YOUR_ACTUAL_COOKIE_FROM_DANA_MEDU_IR",
    clientId: "ligb4vl6-yxqup1ql-uw5by2ae-79f39sg5-90ni9hwp",
};

// --- MAIN EXECUTION ---
async function main() {
    if (credentials.cookie.includes('...') || credentials.clientId.includes('...')) {
        console.error(chalk.red.bold("Authentication Error: Please set your credentials in the 'credentials' object or as environment variables (DANA_COOKIE, DANA_CLIENT_ID)."));
        process.exit(1);
    }
    
    const dana = new DanaClient(credentials);

    console.log(chalk.cyan('Fetching report card...'));
    
    try {
        const reportCard = await dana.getReportCard('EXMlosj07z63gdPL6IM3');
        
        // --- Start of formatted output ---
        console.log(chalk.yellow('\n================================================================'));
        console.log(chalk.bold.white(`👩‍🎓 Student: \t${reportCard.getStudentFullName()}`));
        console.log(chalk.white(`🏫 School: \t${reportCard.getSchoolName()}`));
        console.log(chalk.white(`🪪 National ID: \t${reportCard.getNationalCode()}`));
        console.log(chalk.yellow('----------------------------------------------------------------'));
        console.log(chalk.bold.underline('Course Title'.padEnd(42) + '| Final Grade'));
        console.log(chalk.yellow('----------------------------------------------------------------'));
        
        const grades = reportCard.getGrades();
        grades.forEach(course => {
            const gradeColor = course.finalGrade === null ? chalk.gray : (course.finalGrade < 10 ? chalk.red.bold : chalk.green);
            const gradeText = course.finalGrade !== null ? course.finalGrade.toFixed(2).padStart(7, ' ') : '   N/A   ';
            
            console.log(
                `${chalk.cyan(course.title.padEnd(40, ' '))} | ${gradeColor(gradeText)}`
            );
        });

        console.log(chalk.yellow('----------------------------------------------------------------'));
        const gpa = reportCard.calculateGPA();
        if (gpa !== null) {
            const gpaColor = gpa < 12 ? chalk.red.bold : chalk.green.bold;
            console.log(chalk.bold.white(`Calculated GPA: \t${gpaColor(gpa)}`));
        } else {
            console.log(chalk.white('GPA could not be calculated.'));
        }
        console.log(chalk.yellow('================================================================'));

    } catch (error) {
        console.error(chalk.red.bold(`\nAn error occurred: ${error.message}`));
    }
}

main();
