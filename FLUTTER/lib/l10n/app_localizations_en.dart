// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get login => 'Login';

  @override
  String get email => 'Email';

  @override
  String get password => 'Password';

  @override
  String get signIn => 'Sign In';

  @override
  String get attendance => 'Attendance';

  @override
  String get tasks => 'Tasks';

  @override
  String get leaves => 'Leaves';

  @override
  String get home => 'Home';

  @override
  String get settings => 'Settings';

  @override
  String get clockIn => 'Clock In';

  @override
  String get clockOut => 'Clock Out';

  @override
  String get logout => 'Logout';

  @override
  String get outOfRange => 'You are outside the allowed office area';

  @override
  String get clockInSuccess => 'Clocked in successfully';

  @override
  String get clockOutSuccess => 'Clocked out successfully';

  @override
  String get employmentDetails => 'Employment Details';

  @override
  String get department => 'Department';

  @override
  String get jobTitle => 'Job Title';

  @override
  String get myDocuments => 'My Documents';

  @override
  String get viewDocuments => 'View your documents';

  @override
  String get holidaysEvents => 'Holidays & Events';

  @override
  String get viewHolidays => 'View upcoming holidays';

  @override
  String get noticeBoard => 'Notice Board';

  @override
  String get viewCompanyNotices => 'View company announcements';

  @override
  String get noNoticesFound => 'No published notices found.';

  @override
  String get language => 'Language / ភាសា';

  @override
  String get switchLanguage => 'Switch to Khmer';

  @override
  String get signOut => 'Sign out of your account';

  @override
  String get forgotPassword => 'Forgot Password';

  @override
  String get forgotPasswordDesc => 'Enter your email to receive an OTP';

  @override
  String get sendOtp => 'Send OTP';

  @override
  String get enterOtp => 'Enter the 6-digit OTP';

  @override
  String get verify => 'Verify';

  @override
  String get newPassword => 'New Password';

  @override
  String get confirmPassword => 'Confirm Password';

  @override
  String get resetPassword => 'Reset Password';

  @override
  String get welcomeBack => 'Welcome Back';

  @override
  String get unableToConnect => 'Unable to connect to Server';

  @override
  String get retryConnection => 'Retry Connection';

  @override
  String get checkYourInternet =>
      'Please check your internet connection and try again.';

  @override
  String get somethingWentWrong => 'Something went wrong. Please try again.';

  @override
  String get changeGeneratedPassword =>
      'Please change your auto-generated password immediately for security.';

  @override
  String get profile => 'Profile';

  @override
  String get features => 'Features';

  @override
  String get payrollAndFinance => 'Payroll & Finance';

  @override
  String get changePassword => 'Change Password';

  @override
  String get task => 'Task';

  @override
  String get leave => 'Leave';

  @override
  String get overtime => 'Overtime';

  @override
  String get hrPortal => 'HR Portal';

  @override
  String get standardShift => 'Standard Shift';

  @override
  String get todaysAttendance => 'Today\'s Attendance';

  @override
  String get checkIn => 'Check-In';

  @override
  String get checkOut => 'Check-Out';

  @override
  String get myPayslips => 'My Payslips';

  @override
  String get viewSalarySlips => 'View and download your salary slips';

  @override
  String get requests => 'Requests';

  @override
  String get newRequest => 'New Request';

  @override
  String get leaveType => 'Leave Type';

  @override
  String get selectType => 'Select Type';

  @override
  String get startDate => 'Start Date';

  @override
  String get endDate => 'End Date';

  @override
  String get selectDate => 'Select Date';

  @override
  String get reason => 'Reason';

  @override
  String get enterReasonForLeave => 'Enter reason for leave...';

  @override
  String get submitRequest => 'Submit Request';

  @override
  String get myTasks => 'My Tasks';

  @override
  String get medium => 'MEDIUM';

  @override
  String get attendanceHistory => 'Attendance History';

  @override
  String get overtimeRequests => 'Overtime Requests';

  @override
  String get requestOvertime => 'Request Overtime';

  @override
  String get noOvertimeRequests => 'No overtime requests yet';

  @override
  String get startTimeOptional => 'Start Time';

  @override
  String get endTimeOptional => 'End Time';

  @override
  String get totalHours => 'Total Hours';

  @override
  String get date => 'Date';

  @override
  String get myActivity => 'My Activity';

  @override
  String get myContract => 'My Contract';

  @override
  String get myForms => 'My Forms';

  @override
  String get submitReportsAndForms => 'Submit reports & forms';

  @override
  String get yourLeaveBalance => 'Your Leave Balance';

  @override
  String get daysUnit => 'days';

  @override
  String get chooseFile => 'Choose a file to attach';

  @override
  String get gettingLocation => 'Getting location...';

  @override
  String get locationPermissionDeniedOrGpsDisabled =>
      'Location permission denied or GPS disabled';

  @override
  String get submittingToServer => 'Submitting to server...';

  @override
  String get yourLiveLocation => 'Your Live Location';

  @override
  String get ensureAtOffice => 'Ensure you are at the office';

  @override
  String get yourWeek => 'Your Week';

  @override
  String get offDuty => 'Off Duty';

  @override
  String get onDuty => 'On Duty';

  @override
  String get daySatShort => 'SAT';

  @override
  String get daySunShort => 'SUN';

  @override
  String get dayMonShort => 'MON';

  @override
  String get dayTueShort => 'TUE';

  @override
  String get dayWedShort => 'WED';

  @override
  String get dayThuShort => 'THU';

  @override
  String get dayFriShort => 'FRI';

  @override
  String get statusPresent => 'Present';

  @override
  String get statusLate => 'Late';

  @override
  String get statusEarlyOut => 'Early Out';

  @override
  String get statusWarning => 'Warning';

  @override
  String get statusAbsent => 'Absent';

  @override
  String get failedToLoadHistory => 'Failed to load history';

  @override
  String errorPrefix(String error) {
    return 'Error: $error';
  }

  @override
  String get noAttendanceRecordsFound => 'No attendance records found.';

  @override
  String get hoursLabel => 'Hours';

  @override
  String lateReasonNote(String reason) {
    return 'Late reason: $reason';
  }

  @override
  String get autoClockOutBySystem => 'Auto clocked out by system at shift end';

  @override
  String earlyOutNote(String reason) {
    return 'Early out: $reason';
  }

  @override
  String get attendanceReportTitle => 'Attendance Report';

  @override
  String get statusGood => 'Good';

  @override
  String timeLabel(String time) {
    return 'Time: $time';
  }

  @override
  String newAnnouncementNotifTitle(String title) {
    return 'New Announcement: $title';
  }

  @override
  String get clockOutUndone => 'Clock-out undone. You are clocked in again.';

  @override
  String get locationPermissionDenied => 'Location permission denied';

  @override
  String get submittingEllipsis => 'Submitting...';

  @override
  String get unknownLocation => 'Unknown Location';

  @override
  String get locationCaptured => 'Location Captured';

  @override
  String clockedInAt(String location) {
    return 'Clocked In at: $location';
  }

  @override
  String clockedOutFrom(String location) {
    return 'Clocked Out from: $location';
  }

  @override
  String get youClockedInLate => 'You clocked in late';

  @override
  String get provideLateReasonOptional =>
      'Please provide a reason for being late (optional).';

  @override
  String get lateReasonHint => 'e.g. Traffic, personal emergency...';

  @override
  String get skip => 'Skip';

  @override
  String get submit => 'Submit';

  @override
  String get documentFallbackName => 'Document';

  @override
  String get myAttachedDocuments => 'My Attached Documents';

  @override
  String get noDocumentsFound => 'No documents found.';

  @override
  String get go => 'Go';

  @override
  String get employeeIdFallback => 'ID: --';

  @override
  String shiftTime(String start, String end) {
    return 'Shift: $start - $end';
  }

  @override
  String roleLabel(String job) {
    return 'Role: $job';
  }

  @override
  String get completedForToday => 'Completed for today';

  @override
  String get currentlyClockedIn => 'Currently clocked in';

  @override
  String inOutTimes(String inTime, String outTime) {
    return 'In: $inTime  •  Out: $outTime';
  }

  @override
  String sinceTime(String time) {
    return 'Since $time';
  }

  @override
  String get clockedOutByMistakeUndo => 'Clocked out by mistake? Undo';

  @override
  String get notClockedInYet => 'Not clocked in yet';

  @override
  String get couldNotLaunchDocument => 'Could not launch document url';

  @override
  String get noSpecialInstructions => 'No special instructions.';

  @override
  String get you => 'You';

  @override
  String get instructions => 'Instructions';

  @override
  String get uploaded => 'Uploaded';

  @override
  String get uploadedBy => 'Uploaded By';

  @override
  String get viewDocument => 'View Document';

  @override
  String get documents => 'Documents';

  @override
  String get failedToLoadImage => 'Failed to load image';

  @override
  String get cannotPreviewFileType => 'Cannot preview this file type in-app.';

  @override
  String get openExternally => 'Open Externally';

  @override
  String get profileUpdatedSuccessfully => 'Profile updated successfully!';

  @override
  String get editProfile => 'Edit Profile';

  @override
  String get personalInformation => 'Personal Information';

  @override
  String get firstName => 'First Name';

  @override
  String get lastName => 'Last Name';

  @override
  String get contactDetails => 'Contact Details';

  @override
  String get phoneNumber => 'Phone Number';

  @override
  String get address => 'Address';

  @override
  String get additionalDetails => 'Additional Details';

  @override
  String get khmerName => 'Khmer Name';

  @override
  String get emergencyContact => 'Emergency Contact';

  @override
  String get saveChanges => 'Save Changes';

  @override
  String pleaseEnterField(String field) {
    return 'Please enter $field';
  }

  @override
  String get emailRequired => 'Email is required';

  @override
  String get otpSent => 'OTP Sent!';

  @override
  String get failedToSendResetLink => 'Failed to send reset link';

  @override
  String get allFieldsRequired => 'All fields are required';

  @override
  String get passwordsDoNotMatch => 'Passwords do not match';

  @override
  String get passwordResetSuccessfully => 'Password reset successfully';

  @override
  String get failedToResetPassword => 'Failed to reset password';

  @override
  String sentCodeTo(String email) {
    return 'We sent a 6-digit code to $email';
  }

  @override
  String get canNowLoginNewPassword =>
      'You can now log in with your new password.';

  @override
  String get emailAddress => 'Email Address';

  @override
  String get sixDigitCode => '6-Digit Code';

  @override
  String get confirmNewPassword => 'Confirm New Password';

  @override
  String get goToLogin => 'Go to Login';

  @override
  String get employeeSelfServicePortal => 'Employee Self-Service Portal';

  @override
  String get passwordRequired => 'Password is required';

  @override
  String get allHolidays => 'All Holidays';

  @override
  String get noHolidaysFound => 'No holidays found.';

  @override
  String get comingUpNext => 'Coming Up Next';

  @override
  String get announcement => 'Announcement';

  @override
  String get today => 'Today';

  @override
  String daysLeftCount(int days) {
    return '$days days left';
  }

  @override
  String get event => 'Event';

  @override
  String get selectDates => 'Select dates';

  @override
  String get pleaseSelectLeaveType => 'Please select a leave type';

  @override
  String get leaveRequestedSuccessfully => 'Leave requested successfully!';

  @override
  String get limitBadge => 'LIMIT';

  @override
  String get required => 'Required';

  @override
  String get leaveHistory => 'Leave History';

  @override
  String get noHistory => 'No history';

  @override
  String get history => 'History';

  @override
  String get quickAccess => 'Quick Access';

  @override
  String get myProfile => 'My Profile';

  @override
  String get viewEditYourInfo => 'View & edit your info';

  @override
  String get contractTypeAndDates => 'Contract type & dates';

  @override
  String get clockInAndOut => 'Clock in & out';

  @override
  String get hrDocuments => 'HR documents';

  @override
  String get account => 'Account';

  @override
  String get confirmSignOut => 'Are you sure you want to sign out?';

  @override
  String get cancel => 'Cancel';

  @override
  String get employeeFallback => 'Employee';

  @override
  String get userFallback => 'User';

  @override
  String get failedToLoadContract => 'Failed to load contract';

  @override
  String get contractProbation => 'Probation';

  @override
  String get contractFixedTerm => 'Fixed Term';

  @override
  String get contractPermanent => 'Permanent';

  @override
  String get previousContracts => 'Previous Contracts';

  @override
  String get noActiveContract => 'No active contract on record.';

  @override
  String get contactHrForInfo => 'Please contact HR for more information.';

  @override
  String get currentContractLabel => 'Current Contract';

  @override
  String get activeBadge => 'ACTIVE';

  @override
  String get openEnded => 'Open-ended';

  @override
  String daysLeftInProbation(int days) {
    return '$days days left in probation';
  }

  @override
  String daysUntilContractEnds(int days) {
    return '$days days until contract ends';
  }

  @override
  String get notes => 'Notes';

  @override
  String get noFormsAvailable => 'No forms available yet';

  @override
  String get justNow => 'Just now';

  @override
  String minutesAgo(int minutes) {
    return '${minutes}m ago';
  }

  @override
  String hoursAgo(int hours) {
    return '${hours}h ago';
  }

  @override
  String daysAgo(int days) {
    return '${days}d ago';
  }

  @override
  String get clearAll => 'Clear All';

  @override
  String get confirmClearAllNotifications =>
      'Are you sure you want to delete all notifications?';

  @override
  String get notifications => 'Notifications';

  @override
  String get allCaughtUp => 'All caught up!';

  @override
  String get noNewNotifications => 'No new notifications right now.';

  @override
  String get notificationDeleted => 'Notification deleted';

  @override
  String get defaultNotificationMessage => 'You have a new notification';

  @override
  String get notifLeaveRequest => 'Leave Request';

  @override
  String get notifLeaveUpdate => 'Leave Update';

  @override
  String get notifAttendanceUpdate => 'Attendance Update';

  @override
  String get notifNewHoliday => 'New Holiday';

  @override
  String get notifTaskCompleted => 'Task Completed';

  @override
  String get notifNewTaskAssigned => 'New Task Assigned';

  @override
  String get notifDocumentReceived => 'Document Received';

  @override
  String get notifFormSubmission => 'Form Submission';

  @override
  String get notificationLabel => 'Notification';

  @override
  String get submitOvertimeRequestDesc =>
      'Submit a request to work extra hours';

  @override
  String get hoursHintExample => 'e.g. 2.5';

  @override
  String get overtimeReasonHint =>
      'e.g. Server maintenance, Project deadline...';

  @override
  String get pleaseFillRequiredFields => 'Please fill required fields';

  @override
  String hoursValue(String hours) {
    return '$hours Hours';
  }

  @override
  String totalPayslipsCount(int count) {
    return '$count Total Payslips';
  }

  @override
  String get noPayslipsYet => 'No Payslips Yet';

  @override
  String get payslipsWillAppearHere =>
      'Your payslips will appear here\nonce generated by HR.';

  @override
  String payslipMonthYear(String month, String year) {
    return 'Payslip - $month $year';
  }

  @override
  String get tapToViewDetails => 'Tap to view full details';

  @override
  String get issuedBadge => 'ISSUED';

  @override
  String get grossSalary => 'Gross Salary';

  @override
  String get netPay => 'Net Pay';

  @override
  String monthYearPayslip(String month, String year) {
    return '$month $year Payslip';
  }

  @override
  String get verificationRequired => 'Verification Required';

  @override
  String get visitHrToVerify =>
      'Please visit the HR office to verify your work hours and sign your physical timesheet to unlock this payslip.';

  @override
  String salarySlipMonthYear(String month, String year) {
    return 'SALARY SLIP  •  $month $year';
  }

  @override
  String get earningsSection => 'Earnings';

  @override
  String get basicSalary => 'Basic Salary';

  @override
  String get overtimeOT => 'Overtime (OT)';

  @override
  String get commission => 'Commission';

  @override
  String get attendanceBonus => 'Attendance Bonus';

  @override
  String get allowances => 'Allowances';

  @override
  String get totalEarnings => 'Total Earnings';

  @override
  String get deductionsSection => '➖ Deductions';

  @override
  String get tax => 'Tax';

  @override
  String get advanceDeduction => 'Advance Deduction';

  @override
  String get unpaidLeave => 'Unpaid Leave';

  @override
  String get otherDeductions => 'Other Deductions';

  @override
  String get noneTaxExempt => 'None / Tax';

  @override
  String get totalDeductions => 'Total Deductions';

  @override
  String get netSalaryCaps => 'NET SALARY';

  @override
  String verifiedReleasedOn(String date) {
    return 'Verified and Released on $date';
  }

  @override
  String get genericTimeFallback => 'time';

  @override
  String get monthJan => 'Jan';

  @override
  String get monthFeb => 'Feb';

  @override
  String get monthMar => 'Mar';

  @override
  String get monthApr => 'Apr';

  @override
  String get monthMay => 'May';

  @override
  String get monthJun => 'Jun';

  @override
  String get monthJul => 'Jul';

  @override
  String get monthAug => 'Aug';

  @override
  String get monthSep => 'Sep';

  @override
  String get monthOct => 'Oct';

  @override
  String get monthNov => 'Nov';

  @override
  String get monthDec => 'Dec';

  @override
  String get notApplicable => 'N/A';

  @override
  String get uploadingImage => 'Uploading image...';

  @override
  String get profilePictureUpdated => 'Profile picture updated!';

  @override
  String get networkError => 'Network error';

  @override
  String uploadFailed(String error) {
    return 'Upload failed: $error';
  }

  @override
  String get currentPassword => 'Current Password';

  @override
  String get passwordMinLength => 'Password must be at least 6 characters';

  @override
  String get passwordChangedSuccessfully => 'Password changed successfully!';

  @override
  String get save => 'Save';

  @override
  String get empCode => 'Emp Code';

  @override
  String get joined => 'Joined';

  @override
  String get viewLess => 'View Less';

  @override
  String get viewMoreDetails => 'View More Details';

  @override
  String get attachProof => 'Attach Proof';

  @override
  String get takePhoto => 'Take Photo';

  @override
  String get recordVideo => 'Record Video';

  @override
  String get choosePhotoFromGallery => 'Choose Photo from Gallery';

  @override
  String get chooseVideoFromGallery => 'Choose Video from Gallery';

  @override
  String get attachProofQuestion => 'Attach Proof?';

  @override
  String get attachProofPrompt =>
      'Would you like to attach a photo or video of your completed task?';

  @override
  String get attachMedia => 'Attach Media';

  @override
  String get untitledTask => 'Untitled Task';

  @override
  String get low => 'LOW';

  @override
  String get noDescriptionProvided => 'No additional description provided.';

  @override
  String dueDateLabel(String date) {
    return 'Due Date: $date';
  }

  @override
  String get noDueDate => 'No Due Date';

  @override
  String get attachments => 'Attachments';

  @override
  String get adminInstructions => 'Admin Instructions';

  @override
  String get yourSubmission => 'Your Submission';

  @override
  String get submissionNote => 'Submission Note';

  @override
  String get addNoteOptional => 'Add a note or remark (optional)';

  @override
  String get changeProofFile => 'Change Proof File';

  @override
  String get attachPhotoOrVideoProof => 'Attach Photo or Video Proof';

  @override
  String get proofAttachedReady => 'Proof attached and ready to submit!';

  @override
  String get completedLabel => 'Completed';

  @override
  String get saveNewProof => 'Save New Proof';

  @override
  String get markAsComplete => 'Mark as Complete';

  @override
  String get noTasksAssigned => 'No tasks assigned to you.';

  @override
  String get untitled => 'Untitled';

  @override
  String get submittedSuccessfully => 'Submitted successfully!';

  @override
  String get enterValidNumber => 'Enter a valid number';

  @override
  String get yes => 'Yes';

  @override
  String get select => 'Select';

  @override
  String get mySubmissions => 'My Submissions';

  @override
  String get noSubmissionsYet => 'No submissions yet';

  @override
  String get submissionLabel => 'Submission';

  @override
  String get adminFallback => 'Admin';
}
