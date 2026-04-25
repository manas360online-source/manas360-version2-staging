# Daily Assessment & Analytics Feature

## Overview
This feature adds comprehensive assessment tracking, daily wellbeing checking, and detailed analytics to the MANAS360 patient dashboard.

## What's New

### 1. **Three Assessment Options in Patient Dashboard**

#### Quick Mental Check (Existing)
- 6-question, 1-minute self-check
- Rates: Mood, Sleep quality, Stress load, Energy level, Focus ability, Social connection
- Scale: 0-4 for each question

#### Daily Assessment (NEW)
- 5-question daily wellbeing tracker
- Questions:
  - How is your mood today? (0-10)
  - Sleep quality (0-10)
  - Energy level (0-10)
  - Anxiety level - 0=none, 10=severe (0-10)
  - Overall wellbeing - 0=poor, 10=excellent (0-10)
- Real-time feedback: ✓ Good (7+), ◐ Moderate (4-6), ✗ Low (<4)
- Perfect for daily mood tracking and habit formation
- Results auto-saved with timestamp

#### Clinical Assessments (Existing)
- PHQ-9: Depression symptom screening (0-27)
- GAD-7: Anxiety severity screening (0-21)
- PSS-10: Perceived stress evaluation (0-40)
- ISI: Insomnia severity index (0-28)

### 2. **Assessment History & Reports**

#### In-Page History
- Displays last 20 assessments in dropdown
- Shows: Date, Type, Score, Severity Level
- Color-coded severity (Red=Severe, Amber=Moderate, Green=Mild)
- Sortable by date (newest first)
- Refresh button to reload history

#### New Assessment Analytics Dashboard
- **Route**: `/patient/assessment-reports`
- **Menu Location**: Progress section → "Assessment Analytics"

### 3. **Assessment Reports Page Features**

#### Filters
- **Assessment Type**: All, Quick Check, Clinical, Daily Check
- **Time Range**: Last Week, Last Month, Last Year

#### Key Metrics
- Total Assessments (for selected period)
- Average Score (0-10 or 0-27 depending on type)
- Trend Analysis: Improving 📈 / Declining 📉 / Stable ➡️
- Severity Breakdown: Count of Severe/Moderate/Mild assessments

#### Visualizations
1. **Score Trend Chart** (Last 14 assessments)
   - Bar chart showing score progression
   - Helps identify patterns and improvements

2. **Severity Breakdown**
   - Stacked breakdown as percentage
   - Shows distribution of assessment levels

3. **Recent Assessments Table**
   - Sortable table of last 10 assessments
   - Columns: Date, Type, Score, Severity Level
   - Color-coded severity badges

#### Intelligent Recommendations
- **If Improving**: "Great progress! Your overall wellbeing is trending upward."
- **If Declining**: "Attention needed. Your scores are declining."
- **If Stable**: "Status quo: Your wellbeing is stable. Consistency is key."
- **High Severity Alert**: Shows if any assessments are severe
- **Next Steps**: Actionable recommendations for continued improvement

## Data Storage

### Frontend Storage (Local)
- Daily assessments are stored in component state
- Persist in browser during session
- Auto-refresh on page reload

### Backend Integration (Optional)
- Can connect to `PatientAssessment` table for persistence
- Use `PatientMoodEntry` for daily tracking
- API endpoint: `POST /api/v1/patient/assessments`

## User Flow

1. **Patient navigates to**: `/patient/assessments`
2. **Selects assessment type**: Quick Mental Check, Daily Assessment, or Clinical
3. **Answers questions** with interactive sliders/multiple choice
4. **Submits** and gets immediate results with recommendations
5. **Views history** in the assessment history section
6. **Accesses analytics** at `/patient/assessment-reports`
7. **Tracks progress** over time with trend analysis and recommendations

## Files Modified/Created

### Frontend Files

#### Created:
- `frontend/src/pages/patient/AssessmentReportsPage.tsx` - Analytics dashboard with charts and recommendations

#### Modified:
- `frontend/src/pages/patient/AssessmentsPage.tsx`
  - Added Daily Assessment mode (`AssessmentMode = 'quick' | 'clinical' | 'daily'`)
  - Added Daily Assessment questions and form
  - Added `onSubmitDailyCheck()` function
  - Added assessment history state and display
  - Added `loadAssessmentHistory()` function
  - Updated three-tab layout for Quick/Daily/Clinical

- `frontend/src/App.tsx`
  - Imported `AssessmentReportsPage`
  - Added route: `<Route path="assessment-reports" element={<AssessmentReportsPage />} />`

- `frontend/src/components/layout/PatientDashboardLayout.tsx`
  - Added "Assessment Analytics" to `progressNavItems`
  - Added `/patient/assessment-reports` to `pageTitleMap`

## UI Components

### Assessment Mode Selector
- 3-column grid on desktop
- Full-width on mobile
- Calendar icon for Daily Assessment

### Daily Assessment Form
- 5 questions with range sliders (0-10)
- Real-time score display
- Severity indicators (Good/Moderate/Low)
- "Submit Daily Check" button

### Assessment History
- Scrollable list of 20 most recent
- Shows type, date, score, severity level
- Color-coded severity badges
- "Refresh History" button

### Analytics Dashboard Cards
- 4 metric cards: Total, Average, Trend, Breakdown
- Status indicators (📈📉➡️)
- Percentage displays

### Charts & Visualizations
- Score trend bar chart (14-day history)
- Severity breakdown progress bars
- Recent assessments data table

## Recommendations Algorithm

### Trend Detection
- Compares recent average (first 1/3 of filtered data) to older average (second 1/2)
- Determining: Improving, Declining, or Stable

### Severity Rules
- Severe: >= 15 (PHQ-9/GAD-7) or >= 20 (PSS-10)
- Moderate: 8-14 (PHQ-9/GAD-7) or 10-19 (PSS-10)
- Mild: < 8 overall

### Auto-Generated Insights
- Shows trend-specific guidance
- Flags high severity cases
- Provides next steps based on data patterns

## Integration with Existing Features

- **Therapy Plan**: Can schedule follow-ups based on assessment trends
- **Mood Tracker**: Daily assessments feed into mood tracking
- **Progress Insights**: Assessment data contributes to progress visualization
- **Care Team Communication**: Can share reports with therapist/psychiatrist
- **Crisis Support**: High severity assessments can trigger crisis alerts

## Technical Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Charts**: Custom bar charts with CSS
- **State Management**: React hooks (useState, useMemo, useEffect)
- **API Integration**: patientApi.getMoodHistory() for data loading
- **Icons**: lucide-react (Calendar, TrendingUp, BarChart3, LineChart, Filter)

## Future Enhancements

1. **Push Notifications**: Remind patients to complete daily assessments
2. **Email Reports**: Weekly/monthly assessment summaries
3. **AI Insights**: ML-powered predictions based on assessment patterns
4. **Therapist Dashboard**: Providers can view patient assessment trends
5. **Export to PDF**: Download assessment reports
6. **Comparison Charts**: Compare same assessment type across time
7. **Goal Setting**: Set target scores and track progress
8. **Integration with Calendar**: Schedule "check-in" days based on trends

## Testing Checklist

- [ ] Daily Assessment form submits without errors
- [ ] Assessment history displays correctly
- [ ] Trend analysis calculations are accurate
- [ ] Charts render properly on mobile/desktop
- [ ] Filters work correctly
- [ ] Time range filtering works
- [ ] Recommendations display appropriately
- [ ] TypeScript errors resolved
- [ ] No console warnings/errors
- [ ] Responsive design on all screen sizes

## Notes for Backend Integration

When ready to persist assessments to database:

1. Create migration to enhance `PatientAssessment` table:
   ```sql
   ALTER TABLE patient_assessments ADD COLUMN assessment_type VARCHAR(50);
   ALTER TABLE patient_assessments ADD COLUMN daily_answers JSONB;
   ALTER TABLE patient_assessments ADD COLUMN severity_level VARCHAR(20);
   ```

2. Create endpoint: `POST /api/v1/patient/daily-assessments`

3. Modify `onSubmitDailyCheck()` to call backend endpoint

4. Add batch job to auto-generate daily reminders
