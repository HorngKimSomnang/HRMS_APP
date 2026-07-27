import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_km.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('km'),
  ];

  /// No description provided for @login.
  ///
  /// In en, this message translates to:
  /// **'Login'**
  String get login;

  /// No description provided for @email.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get email;

  /// No description provided for @password.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get password;

  /// No description provided for @signIn.
  ///
  /// In en, this message translates to:
  /// **'Sign In'**
  String get signIn;

  /// No description provided for @attendance.
  ///
  /// In en, this message translates to:
  /// **'Attendance'**
  String get attendance;

  /// No description provided for @tasks.
  ///
  /// In en, this message translates to:
  /// **'Tasks'**
  String get tasks;

  /// No description provided for @leaves.
  ///
  /// In en, this message translates to:
  /// **'Leaves'**
  String get leaves;

  /// No description provided for @home.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get home;

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// No description provided for @clockIn.
  ///
  /// In en, this message translates to:
  /// **'Clock In'**
  String get clockIn;

  /// No description provided for @clockOut.
  ///
  /// In en, this message translates to:
  /// **'Clock Out'**
  String get clockOut;

  /// No description provided for @logout.
  ///
  /// In en, this message translates to:
  /// **'Logout'**
  String get logout;

  /// No description provided for @outOfRange.
  ///
  /// In en, this message translates to:
  /// **'You are outside the allowed office area'**
  String get outOfRange;

  /// No description provided for @clockInSuccess.
  ///
  /// In en, this message translates to:
  /// **'Clocked in successfully'**
  String get clockInSuccess;

  /// No description provided for @clockOutSuccess.
  ///
  /// In en, this message translates to:
  /// **'Clocked out successfully'**
  String get clockOutSuccess;

  /// No description provided for @employmentDetails.
  ///
  /// In en, this message translates to:
  /// **'Employment Details'**
  String get employmentDetails;

  /// No description provided for @department.
  ///
  /// In en, this message translates to:
  /// **'Department'**
  String get department;

  /// No description provided for @jobTitle.
  ///
  /// In en, this message translates to:
  /// **'Job Title'**
  String get jobTitle;

  /// No description provided for @myDocuments.
  ///
  /// In en, this message translates to:
  /// **'My Documents'**
  String get myDocuments;

  /// No description provided for @viewDocuments.
  ///
  /// In en, this message translates to:
  /// **'View your documents'**
  String get viewDocuments;

  /// No description provided for @holidaysEvents.
  ///
  /// In en, this message translates to:
  /// **'Holidays & Events'**
  String get holidaysEvents;

  /// No description provided for @viewHolidays.
  ///
  /// In en, this message translates to:
  /// **'View upcoming holidays'**
  String get viewHolidays;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language / ភាសា'**
  String get language;

  /// No description provided for @switchLanguage.
  ///
  /// In en, this message translates to:
  /// **'Switch to Khmer'**
  String get switchLanguage;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out of your account'**
  String get signOut;

  /// No description provided for @forgotPassword.
  ///
  /// In en, this message translates to:
  /// **'Forgot Password'**
  String get forgotPassword;

  /// No description provided for @forgotPasswordDesc.
  ///
  /// In en, this message translates to:
  /// **'Enter your email to receive an OTP'**
  String get forgotPasswordDesc;

  /// No description provided for @sendOtp.
  ///
  /// In en, this message translates to:
  /// **'Send OTP'**
  String get sendOtp;

  /// No description provided for @enterOtp.
  ///
  /// In en, this message translates to:
  /// **'Enter the 6-digit OTP'**
  String get enterOtp;

  /// No description provided for @verify.
  ///
  /// In en, this message translates to:
  /// **'Verify'**
  String get verify;

  /// No description provided for @newPassword.
  ///
  /// In en, this message translates to:
  /// **'New Password'**
  String get newPassword;

  /// No description provided for @confirmPassword.
  ///
  /// In en, this message translates to:
  /// **'Confirm Password'**
  String get confirmPassword;

  /// No description provided for @resetPassword.
  ///
  /// In en, this message translates to:
  /// **'Reset Password'**
  String get resetPassword;

  /// No description provided for @welcomeBack.
  ///
  /// In en, this message translates to:
  /// **'Welcome Back'**
  String get welcomeBack;

  /// No description provided for @unableToConnect.
  ///
  /// In en, this message translates to:
  /// **'Unable to connect to Server'**
  String get unableToConnect;

  /// No description provided for @retryConnection.
  ///
  /// In en, this message translates to:
  /// **'Retry Connection'**
  String get retryConnection;

  /// No description provided for @checkYourInternet.
  ///
  /// In en, this message translates to:
  /// **'Please check your internet connection and try again.'**
  String get checkYourInternet;

  /// No description provided for @somethingWentWrong.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get somethingWentWrong;

  /// No description provided for @changeGeneratedPassword.
  ///
  /// In en, this message translates to:
  /// **'Please change your auto-generated password immediately for security.'**
  String get changeGeneratedPassword;

  /// No description provided for @profile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profile;

  /// No description provided for @features.
  ///
  /// In en, this message translates to:
  /// **'Features'**
  String get features;

  /// No description provided for @payrollAndFinance.
  ///
  /// In en, this message translates to:
  /// **'Payroll & Finance'**
  String get payrollAndFinance;

  /// No description provided for @changePassword.
  ///
  /// In en, this message translates to:
  /// **'Change Password'**
  String get changePassword;

  /// No description provided for @task.
  ///
  /// In en, this message translates to:
  /// **'Task'**
  String get task;

  /// No description provided for @leave.
  ///
  /// In en, this message translates to:
  /// **'Leave'**
  String get leave;

  /// No description provided for @overtime.
  ///
  /// In en, this message translates to:
  /// **'Overtime'**
  String get overtime;

  /// No description provided for @hrPortal.
  ///
  /// In en, this message translates to:
  /// **'HR Portal'**
  String get hrPortal;

  /// No description provided for @standardShift.
  ///
  /// In en, this message translates to:
  /// **'Standard Shift'**
  String get standardShift;

  /// No description provided for @todaysAttendance.
  ///
  /// In en, this message translates to:
  /// **'Today\'s Attendance'**
  String get todaysAttendance;

  /// No description provided for @checkIn.
  ///
  /// In en, this message translates to:
  /// **'Check-In'**
  String get checkIn;

  /// No description provided for @checkOut.
  ///
  /// In en, this message translates to:
  /// **'Check-Out'**
  String get checkOut;

  /// No description provided for @myPayslips.
  ///
  /// In en, this message translates to:
  /// **'My Payslips'**
  String get myPayslips;

  /// No description provided for @viewSalarySlips.
  ///
  /// In en, this message translates to:
  /// **'View and download your salary slips'**
  String get viewSalarySlips;

  /// No description provided for @requests.
  ///
  /// In en, this message translates to:
  /// **'Requests'**
  String get requests;

  /// No description provided for @newRequest.
  ///
  /// In en, this message translates to:
  /// **'New Request'**
  String get newRequest;

  /// No description provided for @leaveType.
  ///
  /// In en, this message translates to:
  /// **'Leave Type'**
  String get leaveType;

  /// No description provided for @selectType.
  ///
  /// In en, this message translates to:
  /// **'Select Type'**
  String get selectType;

  /// No description provided for @startDate.
  ///
  /// In en, this message translates to:
  /// **'Start Date'**
  String get startDate;

  /// No description provided for @endDate.
  ///
  /// In en, this message translates to:
  /// **'End Date'**
  String get endDate;

  /// No description provided for @selectDate.
  ///
  /// In en, this message translates to:
  /// **'Select Date'**
  String get selectDate;

  /// No description provided for @reason.
  ///
  /// In en, this message translates to:
  /// **'Reason'**
  String get reason;

  /// No description provided for @enterReasonForLeave.
  ///
  /// In en, this message translates to:
  /// **'Enter reason for leave...'**
  String get enterReasonForLeave;

  /// No description provided for @submitRequest.
  ///
  /// In en, this message translates to:
  /// **'Submit Request'**
  String get submitRequest;

  /// No description provided for @myTasks.
  ///
  /// In en, this message translates to:
  /// **'My Tasks'**
  String get myTasks;

  /// No description provided for @medium.
  ///
  /// In en, this message translates to:
  /// **'MEDIUM'**
  String get medium;

  /// No description provided for @attendanceHistory.
  ///
  /// In en, this message translates to:
  /// **'Attendance History'**
  String get attendanceHistory;

  /// No description provided for @overtimeRequests.
  ///
  /// In en, this message translates to:
  /// **'Overtime Requests'**
  String get overtimeRequests;

  /// No description provided for @requestOvertime.
  ///
  /// In en, this message translates to:
  /// **'Request Overtime'**
  String get requestOvertime;

  /// No description provided for @noOvertimeRequests.
  ///
  /// In en, this message translates to:
  /// **'No overtime requests yet'**
  String get noOvertimeRequests;

  /// No description provided for @startTimeOptional.
  ///
  /// In en, this message translates to:
  /// **'Start Time'**
  String get startTimeOptional;

  /// No description provided for @endTimeOptional.
  ///
  /// In en, this message translates to:
  /// **'End Time'**
  String get endTimeOptional;

  /// No description provided for @totalHours.
  ///
  /// In en, this message translates to:
  /// **'Total Hours'**
  String get totalHours;

  /// No description provided for @date.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get date;

  /// No description provided for @myActivity.
  ///
  /// In en, this message translates to:
  /// **'My Activity'**
  String get myActivity;

  /// No description provided for @myContract.
  ///
  /// In en, this message translates to:
  /// **'My Contract'**
  String get myContract;

  /// No description provided for @myForms.
  ///
  /// In en, this message translates to:
  /// **'My Forms'**
  String get myForms;

  /// No description provided for @submitReportsAndForms.
  ///
  /// In en, this message translates to:
  /// **'Submit reports & forms'**
  String get submitReportsAndForms;

  /// No description provided for @yourLeaveBalance.
  ///
  /// In en, this message translates to:
  /// **'Your Leave Balance'**
  String get yourLeaveBalance;

  /// No description provided for @daysUnit.
  ///
  /// In en, this message translates to:
  /// **'days'**
  String get daysUnit;

  /// No description provided for @chooseFile.
  ///
  /// In en, this message translates to:
  /// **'Choose a file to attach'**
  String get chooseFile;

  /// No description provided for @gettingLocation.
  ///
  /// In en, this message translates to:
  /// **'Getting location...'**
  String get gettingLocation;

  /// No description provided for @locationPermissionDeniedOrGpsDisabled.
  ///
  /// In en, this message translates to:
  /// **'Location permission denied or GPS disabled'**
  String get locationPermissionDeniedOrGpsDisabled;

  /// No description provided for @submittingToServer.
  ///
  /// In en, this message translates to:
  /// **'Submitting to server...'**
  String get submittingToServer;

  /// No description provided for @yourLiveLocation.
  ///
  /// In en, this message translates to:
  /// **'Your Live Location'**
  String get yourLiveLocation;

  /// No description provided for @ensureAtOffice.
  ///
  /// In en, this message translates to:
  /// **'Ensure you are at the office'**
  String get ensureAtOffice;

  /// No description provided for @yourWeek.
  ///
  /// In en, this message translates to:
  /// **'Your Week'**
  String get yourWeek;

  /// No description provided for @offDuty.
  ///
  /// In en, this message translates to:
  /// **'Off Duty'**
  String get offDuty;

  /// No description provided for @onDuty.
  ///
  /// In en, this message translates to:
  /// **'On Duty'**
  String get onDuty;

  /// No description provided for @daySatShort.
  ///
  /// In en, this message translates to:
  /// **'SAT'**
  String get daySatShort;

  /// No description provided for @daySunShort.
  ///
  /// In en, this message translates to:
  /// **'SUN'**
  String get daySunShort;

  /// No description provided for @dayMonShort.
  ///
  /// In en, this message translates to:
  /// **'MON'**
  String get dayMonShort;

  /// No description provided for @dayTueShort.
  ///
  /// In en, this message translates to:
  /// **'TUE'**
  String get dayTueShort;

  /// No description provided for @dayWedShort.
  ///
  /// In en, this message translates to:
  /// **'WED'**
  String get dayWedShort;

  /// No description provided for @dayThuShort.
  ///
  /// In en, this message translates to:
  /// **'THU'**
  String get dayThuShort;

  /// No description provided for @dayFriShort.
  ///
  /// In en, this message translates to:
  /// **'FRI'**
  String get dayFriShort;

  /// No description provided for @statusPresent.
  ///
  /// In en, this message translates to:
  /// **'Present'**
  String get statusPresent;

  /// No description provided for @statusLate.
  ///
  /// In en, this message translates to:
  /// **'Late'**
  String get statusLate;

  /// No description provided for @statusEarlyOut.
  ///
  /// In en, this message translates to:
  /// **'Early Out'**
  String get statusEarlyOut;

  /// No description provided for @statusWarning.
  ///
  /// In en, this message translates to:
  /// **'Warning'**
  String get statusWarning;

  /// No description provided for @statusAbsent.
  ///
  /// In en, this message translates to:
  /// **'Absent'**
  String get statusAbsent;

  /// No description provided for @failedToLoadHistory.
  ///
  /// In en, this message translates to:
  /// **'Failed to load history'**
  String get failedToLoadHistory;

  /// No description provided for @errorPrefix.
  ///
  /// In en, this message translates to:
  /// **'Error: {error}'**
  String errorPrefix(String error);

  /// No description provided for @noAttendanceRecordsFound.
  ///
  /// In en, this message translates to:
  /// **'No attendance records found.'**
  String get noAttendanceRecordsFound;

  /// No description provided for @hoursLabel.
  ///
  /// In en, this message translates to:
  /// **'Hours'**
  String get hoursLabel;

  /// No description provided for @lateReasonNote.
  ///
  /// In en, this message translates to:
  /// **'Late reason: {reason}'**
  String lateReasonNote(String reason);

  /// No description provided for @autoClockOutBySystem.
  ///
  /// In en, this message translates to:
  /// **'Auto clocked out by system at shift end'**
  String get autoClockOutBySystem;

  /// No description provided for @earlyOutNote.
  ///
  /// In en, this message translates to:
  /// **'Early out: {reason}'**
  String earlyOutNote(String reason);

  /// No description provided for @attendanceReportTitle.
  ///
  /// In en, this message translates to:
  /// **'Attendance Report'**
  String get attendanceReportTitle;

  /// No description provided for @statusGood.
  ///
  /// In en, this message translates to:
  /// **'Good'**
  String get statusGood;

  /// No description provided for @timeLabel.
  ///
  /// In en, this message translates to:
  /// **'Time: {time}'**
  String timeLabel(String time);

  /// No description provided for @newAnnouncementNotifTitle.
  ///
  /// In en, this message translates to:
  /// **'New Announcement: {title}'**
  String newAnnouncementNotifTitle(String title);

  /// No description provided for @clockOutUndone.
  ///
  /// In en, this message translates to:
  /// **'Clock-out undone. You are clocked in again.'**
  String get clockOutUndone;

  /// No description provided for @locationPermissionDenied.
  ///
  /// In en, this message translates to:
  /// **'Location permission denied'**
  String get locationPermissionDenied;

  /// No description provided for @submittingEllipsis.
  ///
  /// In en, this message translates to:
  /// **'Submitting...'**
  String get submittingEllipsis;

  /// No description provided for @unknownLocation.
  ///
  /// In en, this message translates to:
  /// **'Unknown Location'**
  String get unknownLocation;

  /// No description provided for @locationCaptured.
  ///
  /// In en, this message translates to:
  /// **'Location Captured'**
  String get locationCaptured;

  /// No description provided for @clockedInAt.
  ///
  /// In en, this message translates to:
  /// **'Clocked In at: {location}'**
  String clockedInAt(String location);

  /// No description provided for @clockedOutFrom.
  ///
  /// In en, this message translates to:
  /// **'Clocked Out from: {location}'**
  String clockedOutFrom(String location);

  /// No description provided for @youClockedInLate.
  ///
  /// In en, this message translates to:
  /// **'You clocked in late'**
  String get youClockedInLate;

  /// No description provided for @provideLateReasonOptional.
  ///
  /// In en, this message translates to:
  /// **'Please provide a reason for being late (optional).'**
  String get provideLateReasonOptional;

  /// No description provided for @lateReasonHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Traffic, personal emergency...'**
  String get lateReasonHint;

  /// No description provided for @skip.
  ///
  /// In en, this message translates to:
  /// **'Skip'**
  String get skip;

  /// No description provided for @submit.
  ///
  /// In en, this message translates to:
  /// **'Submit'**
  String get submit;

  /// No description provided for @documentFallbackName.
  ///
  /// In en, this message translates to:
  /// **'Document'**
  String get documentFallbackName;

  /// No description provided for @myAttachedDocuments.
  ///
  /// In en, this message translates to:
  /// **'My Attached Documents'**
  String get myAttachedDocuments;

  /// No description provided for @noDocumentsFound.
  ///
  /// In en, this message translates to:
  /// **'No documents found.'**
  String get noDocumentsFound;

  /// No description provided for @go.
  ///
  /// In en, this message translates to:
  /// **'Go'**
  String get go;

  /// No description provided for @employeeIdFallback.
  ///
  /// In en, this message translates to:
  /// **'ID: --'**
  String get employeeIdFallback;

  /// No description provided for @shiftTime.
  ///
  /// In en, this message translates to:
  /// **'Shift: {start} - {end}'**
  String shiftTime(String start, String end);

  /// No description provided for @roleLabel.
  ///
  /// In en, this message translates to:
  /// **'Role: {job}'**
  String roleLabel(String job);

  /// No description provided for @completedForToday.
  ///
  /// In en, this message translates to:
  /// **'Completed for today'**
  String get completedForToday;

  /// No description provided for @currentlyClockedIn.
  ///
  /// In en, this message translates to:
  /// **'Currently clocked in'**
  String get currentlyClockedIn;

  /// No description provided for @inOutTimes.
  ///
  /// In en, this message translates to:
  /// **'In: {inTime}  •  Out: {outTime}'**
  String inOutTimes(String inTime, String outTime);

  /// No description provided for @sinceTime.
  ///
  /// In en, this message translates to:
  /// **'Since {time}'**
  String sinceTime(String time);

  /// No description provided for @clockedOutByMistakeUndo.
  ///
  /// In en, this message translates to:
  /// **'Clocked out by mistake? Undo'**
  String get clockedOutByMistakeUndo;

  /// No description provided for @notClockedInYet.
  ///
  /// In en, this message translates to:
  /// **'Not clocked in yet'**
  String get notClockedInYet;

  /// No description provided for @couldNotLaunchDocument.
  ///
  /// In en, this message translates to:
  /// **'Could not launch document url'**
  String get couldNotLaunchDocument;

  /// No description provided for @noSpecialInstructions.
  ///
  /// In en, this message translates to:
  /// **'No special instructions.'**
  String get noSpecialInstructions;

  /// No description provided for @you.
  ///
  /// In en, this message translates to:
  /// **'You'**
  String get you;

  /// No description provided for @instructions.
  ///
  /// In en, this message translates to:
  /// **'Instructions'**
  String get instructions;

  /// No description provided for @uploaded.
  ///
  /// In en, this message translates to:
  /// **'Uploaded'**
  String get uploaded;

  /// No description provided for @uploadedBy.
  ///
  /// In en, this message translates to:
  /// **'Uploaded By'**
  String get uploadedBy;

  /// No description provided for @viewDocument.
  ///
  /// In en, this message translates to:
  /// **'View Document'**
  String get viewDocument;

  /// No description provided for @documents.
  ///
  /// In en, this message translates to:
  /// **'Documents'**
  String get documents;

  /// No description provided for @failedToLoadImage.
  ///
  /// In en, this message translates to:
  /// **'Failed to load image'**
  String get failedToLoadImage;

  /// No description provided for @cannotPreviewFileType.
  ///
  /// In en, this message translates to:
  /// **'Cannot preview this file type in-app.'**
  String get cannotPreviewFileType;

  /// No description provided for @openExternally.
  ///
  /// In en, this message translates to:
  /// **'Open Externally'**
  String get openExternally;

  /// No description provided for @profileUpdatedSuccessfully.
  ///
  /// In en, this message translates to:
  /// **'Profile updated successfully!'**
  String get profileUpdatedSuccessfully;

  /// No description provided for @editProfile.
  ///
  /// In en, this message translates to:
  /// **'Edit Profile'**
  String get editProfile;

  /// No description provided for @personalInformation.
  ///
  /// In en, this message translates to:
  /// **'Personal Information'**
  String get personalInformation;

  /// No description provided for @firstName.
  ///
  /// In en, this message translates to:
  /// **'First Name'**
  String get firstName;

  /// No description provided for @lastName.
  ///
  /// In en, this message translates to:
  /// **'Last Name'**
  String get lastName;

  /// No description provided for @contactDetails.
  ///
  /// In en, this message translates to:
  /// **'Contact Details'**
  String get contactDetails;

  /// No description provided for @phoneNumber.
  ///
  /// In en, this message translates to:
  /// **'Phone Number'**
  String get phoneNumber;

  /// No description provided for @address.
  ///
  /// In en, this message translates to:
  /// **'Address'**
  String get address;

  /// No description provided for @additionalDetails.
  ///
  /// In en, this message translates to:
  /// **'Additional Details'**
  String get additionalDetails;

  /// No description provided for @khmerName.
  ///
  /// In en, this message translates to:
  /// **'Khmer Name'**
  String get khmerName;

  /// No description provided for @emergencyContact.
  ///
  /// In en, this message translates to:
  /// **'Emergency Contact'**
  String get emergencyContact;

  /// No description provided for @saveChanges.
  ///
  /// In en, this message translates to:
  /// **'Save Changes'**
  String get saveChanges;

  /// No description provided for @pleaseEnterField.
  ///
  /// In en, this message translates to:
  /// **'Please enter {field}'**
  String pleaseEnterField(String field);

  /// No description provided for @emailRequired.
  ///
  /// In en, this message translates to:
  /// **'Email is required'**
  String get emailRequired;

  /// No description provided for @otpSent.
  ///
  /// In en, this message translates to:
  /// **'OTP Sent!'**
  String get otpSent;

  /// No description provided for @failedToSendResetLink.
  ///
  /// In en, this message translates to:
  /// **'Failed to send reset link'**
  String get failedToSendResetLink;

  /// No description provided for @allFieldsRequired.
  ///
  /// In en, this message translates to:
  /// **'All fields are required'**
  String get allFieldsRequired;

  /// No description provided for @passwordsDoNotMatch.
  ///
  /// In en, this message translates to:
  /// **'Passwords do not match'**
  String get passwordsDoNotMatch;

  /// No description provided for @passwordResetSuccessfully.
  ///
  /// In en, this message translates to:
  /// **'Password reset successfully'**
  String get passwordResetSuccessfully;

  /// No description provided for @failedToResetPassword.
  ///
  /// In en, this message translates to:
  /// **'Failed to reset password'**
  String get failedToResetPassword;

  /// No description provided for @sentCodeTo.
  ///
  /// In en, this message translates to:
  /// **'We sent a 6-digit code to {email}'**
  String sentCodeTo(String email);

  /// No description provided for @canNowLoginNewPassword.
  ///
  /// In en, this message translates to:
  /// **'You can now log in with your new password.'**
  String get canNowLoginNewPassword;

  /// No description provided for @emailAddress.
  ///
  /// In en, this message translates to:
  /// **'Email Address'**
  String get emailAddress;

  /// No description provided for @sixDigitCode.
  ///
  /// In en, this message translates to:
  /// **'6-Digit Code'**
  String get sixDigitCode;

  /// No description provided for @confirmNewPassword.
  ///
  /// In en, this message translates to:
  /// **'Confirm New Password'**
  String get confirmNewPassword;

  /// No description provided for @goToLogin.
  ///
  /// In en, this message translates to:
  /// **'Go to Login'**
  String get goToLogin;

  /// No description provided for @employeeSelfServicePortal.
  ///
  /// In en, this message translates to:
  /// **'Employee Self-Service Portal'**
  String get employeeSelfServicePortal;

  /// No description provided for @passwordRequired.
  ///
  /// In en, this message translates to:
  /// **'Password is required'**
  String get passwordRequired;

  /// No description provided for @allHolidays.
  ///
  /// In en, this message translates to:
  /// **'All Holidays'**
  String get allHolidays;

  /// No description provided for @noHolidaysFound.
  ///
  /// In en, this message translates to:
  /// **'No holidays found.'**
  String get noHolidaysFound;

  /// No description provided for @comingUpNext.
  ///
  /// In en, this message translates to:
  /// **'Coming Up Next'**
  String get comingUpNext;

  /// No description provided for @announcement.
  ///
  /// In en, this message translates to:
  /// **'Announcement'**
  String get announcement;

  /// No description provided for @today.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get today;

  /// No description provided for @daysLeftCount.
  ///
  /// In en, this message translates to:
  /// **'{days} days left'**
  String daysLeftCount(int days);

  /// No description provided for @event.
  ///
  /// In en, this message translates to:
  /// **'Event'**
  String get event;

  /// No description provided for @selectDates.
  ///
  /// In en, this message translates to:
  /// **'Select dates'**
  String get selectDates;

  /// No description provided for @pleaseSelectLeaveType.
  ///
  /// In en, this message translates to:
  /// **'Please select a leave type'**
  String get pleaseSelectLeaveType;

  /// No description provided for @leaveRequestedSuccessfully.
  ///
  /// In en, this message translates to:
  /// **'Leave requested successfully!'**
  String get leaveRequestedSuccessfully;

  /// No description provided for @limitBadge.
  ///
  /// In en, this message translates to:
  /// **'LIMIT'**
  String get limitBadge;

  /// No description provided for @required.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get required;

  /// No description provided for @leaveHistory.
  ///
  /// In en, this message translates to:
  /// **'Leave History'**
  String get leaveHistory;

  /// No description provided for @noHistory.
  ///
  /// In en, this message translates to:
  /// **'No history'**
  String get noHistory;

  /// No description provided for @history.
  ///
  /// In en, this message translates to:
  /// **'History'**
  String get history;

  /// No description provided for @quickAccess.
  ///
  /// In en, this message translates to:
  /// **'Quick Access'**
  String get quickAccess;

  /// No description provided for @myProfile.
  ///
  /// In en, this message translates to:
  /// **'My Profile'**
  String get myProfile;

  /// No description provided for @viewEditYourInfo.
  ///
  /// In en, this message translates to:
  /// **'View & edit your info'**
  String get viewEditYourInfo;

  /// No description provided for @contractTypeAndDates.
  ///
  /// In en, this message translates to:
  /// **'Contract type & dates'**
  String get contractTypeAndDates;

  /// No description provided for @clockInAndOut.
  ///
  /// In en, this message translates to:
  /// **'Clock in & out'**
  String get clockInAndOut;

  /// No description provided for @hrDocuments.
  ///
  /// In en, this message translates to:
  /// **'HR documents'**
  String get hrDocuments;

  /// No description provided for @account.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get account;

  /// No description provided for @confirmSignOut.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to sign out?'**
  String get confirmSignOut;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @employeeFallback.
  ///
  /// In en, this message translates to:
  /// **'Employee'**
  String get employeeFallback;

  /// No description provided for @userFallback.
  ///
  /// In en, this message translates to:
  /// **'User'**
  String get userFallback;

  /// No description provided for @failedToLoadContract.
  ///
  /// In en, this message translates to:
  /// **'Failed to load contract'**
  String get failedToLoadContract;

  /// No description provided for @contractProbation.
  ///
  /// In en, this message translates to:
  /// **'Probation'**
  String get contractProbation;

  /// No description provided for @contractFixedTerm.
  ///
  /// In en, this message translates to:
  /// **'Fixed Term'**
  String get contractFixedTerm;

  /// No description provided for @contractPermanent.
  ///
  /// In en, this message translates to:
  /// **'Permanent'**
  String get contractPermanent;

  /// No description provided for @previousContracts.
  ///
  /// In en, this message translates to:
  /// **'Previous Contracts'**
  String get previousContracts;

  /// No description provided for @noActiveContract.
  ///
  /// In en, this message translates to:
  /// **'No active contract on record.'**
  String get noActiveContract;

  /// No description provided for @contactHrForInfo.
  ///
  /// In en, this message translates to:
  /// **'Please contact HR for more information.'**
  String get contactHrForInfo;

  /// No description provided for @currentContractLabel.
  ///
  /// In en, this message translates to:
  /// **'Current Contract'**
  String get currentContractLabel;

  /// No description provided for @activeBadge.
  ///
  /// In en, this message translates to:
  /// **'ACTIVE'**
  String get activeBadge;

  /// No description provided for @openEnded.
  ///
  /// In en, this message translates to:
  /// **'Open-ended'**
  String get openEnded;

  /// No description provided for @daysLeftInProbation.
  ///
  /// In en, this message translates to:
  /// **'{days} days left in probation'**
  String daysLeftInProbation(int days);

  /// No description provided for @daysUntilContractEnds.
  ///
  /// In en, this message translates to:
  /// **'{days} days until contract ends'**
  String daysUntilContractEnds(int days);

  /// No description provided for @notes.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get notes;

  /// No description provided for @noFormsAvailable.
  ///
  /// In en, this message translates to:
  /// **'No forms available yet'**
  String get noFormsAvailable;

  /// No description provided for @justNow.
  ///
  /// In en, this message translates to:
  /// **'Just now'**
  String get justNow;

  /// No description provided for @minutesAgo.
  ///
  /// In en, this message translates to:
  /// **'{minutes}m ago'**
  String minutesAgo(int minutes);

  /// No description provided for @hoursAgo.
  ///
  /// In en, this message translates to:
  /// **'{hours}h ago'**
  String hoursAgo(int hours);

  /// No description provided for @daysAgo.
  ///
  /// In en, this message translates to:
  /// **'{days}d ago'**
  String daysAgo(int days);

  /// No description provided for @clearAll.
  ///
  /// In en, this message translates to:
  /// **'Clear All'**
  String get clearAll;

  /// No description provided for @confirmClearAllNotifications.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete all notifications?'**
  String get confirmClearAllNotifications;

  /// No description provided for @notifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notifications;

  /// No description provided for @allCaughtUp.
  ///
  /// In en, this message translates to:
  /// **'All caught up!'**
  String get allCaughtUp;

  /// No description provided for @noNewNotifications.
  ///
  /// In en, this message translates to:
  /// **'No new notifications right now.'**
  String get noNewNotifications;

  /// No description provided for @notificationDeleted.
  ///
  /// In en, this message translates to:
  /// **'Notification deleted'**
  String get notificationDeleted;

  /// No description provided for @defaultNotificationMessage.
  ///
  /// In en, this message translates to:
  /// **'You have a new notification'**
  String get defaultNotificationMessage;

  /// No description provided for @notifLeaveRequest.
  ///
  /// In en, this message translates to:
  /// **'Leave Request'**
  String get notifLeaveRequest;

  /// No description provided for @notifLeaveUpdate.
  ///
  /// In en, this message translates to:
  /// **'Leave Update'**
  String get notifLeaveUpdate;

  /// No description provided for @notifAttendanceUpdate.
  ///
  /// In en, this message translates to:
  /// **'Attendance Update'**
  String get notifAttendanceUpdate;

  /// No description provided for @notifNewHoliday.
  ///
  /// In en, this message translates to:
  /// **'New Holiday'**
  String get notifNewHoliday;

  /// No description provided for @notifTaskCompleted.
  ///
  /// In en, this message translates to:
  /// **'Task Completed'**
  String get notifTaskCompleted;

  /// No description provided for @notifNewTaskAssigned.
  ///
  /// In en, this message translates to:
  /// **'New Task Assigned'**
  String get notifNewTaskAssigned;

  /// No description provided for @notifDocumentReceived.
  ///
  /// In en, this message translates to:
  /// **'Document Received'**
  String get notifDocumentReceived;

  /// No description provided for @notifFormSubmission.
  ///
  /// In en, this message translates to:
  /// **'Form Submission'**
  String get notifFormSubmission;

  /// No description provided for @notificationLabel.
  ///
  /// In en, this message translates to:
  /// **'Notification'**
  String get notificationLabel;

  /// No description provided for @submitOvertimeRequestDesc.
  ///
  /// In en, this message translates to:
  /// **'Submit a request to work extra hours'**
  String get submitOvertimeRequestDesc;

  /// No description provided for @hoursHintExample.
  ///
  /// In en, this message translates to:
  /// **'e.g. 2.5'**
  String get hoursHintExample;

  /// No description provided for @overtimeReasonHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Server maintenance, Project deadline...'**
  String get overtimeReasonHint;

  /// No description provided for @pleaseFillRequiredFields.
  ///
  /// In en, this message translates to:
  /// **'Please fill required fields'**
  String get pleaseFillRequiredFields;

  /// No description provided for @hoursValue.
  ///
  /// In en, this message translates to:
  /// **'{hours} Hours'**
  String hoursValue(String hours);

  /// No description provided for @totalPayslipsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} Total Payslips'**
  String totalPayslipsCount(int count);

  /// No description provided for @noPayslipsYet.
  ///
  /// In en, this message translates to:
  /// **'No Payslips Yet'**
  String get noPayslipsYet;

  /// No description provided for @payslipsWillAppearHere.
  ///
  /// In en, this message translates to:
  /// **'Your payslips will appear here\nonce generated by HR.'**
  String get payslipsWillAppearHere;

  /// No description provided for @payslipMonthYear.
  ///
  /// In en, this message translates to:
  /// **'Payslip - {month} {year}'**
  String payslipMonthYear(String month, String year);

  /// No description provided for @tapToViewDetails.
  ///
  /// In en, this message translates to:
  /// **'Tap to view full details'**
  String get tapToViewDetails;

  /// No description provided for @issuedBadge.
  ///
  /// In en, this message translates to:
  /// **'ISSUED'**
  String get issuedBadge;

  /// No description provided for @grossSalary.
  ///
  /// In en, this message translates to:
  /// **'Gross Salary'**
  String get grossSalary;

  /// No description provided for @netPay.
  ///
  /// In en, this message translates to:
  /// **'Net Pay'**
  String get netPay;

  /// No description provided for @monthYearPayslip.
  ///
  /// In en, this message translates to:
  /// **'{month} {year} Payslip'**
  String monthYearPayslip(String month, String year);

  /// No description provided for @verificationRequired.
  ///
  /// In en, this message translates to:
  /// **'Verification Required'**
  String get verificationRequired;

  /// No description provided for @visitHrToVerify.
  ///
  /// In en, this message translates to:
  /// **'Please visit the HR office to verify your work hours and sign your physical timesheet to unlock this payslip.'**
  String get visitHrToVerify;

  /// No description provided for @salarySlipMonthYear.
  ///
  /// In en, this message translates to:
  /// **'SALARY SLIP  •  {month} {year}'**
  String salarySlipMonthYear(String month, String year);

  /// No description provided for @earningsSection.
  ///
  /// In en, this message translates to:
  /// **'💰 Earnings'**
  String get earningsSection;

  /// No description provided for @basicSalary.
  ///
  /// In en, this message translates to:
  /// **'Basic Salary'**
  String get basicSalary;

  /// No description provided for @overtimeOT.
  ///
  /// In en, this message translates to:
  /// **'Overtime (OT)'**
  String get overtimeOT;

  /// No description provided for @commission.
  ///
  /// In en, this message translates to:
  /// **'Commission'**
  String get commission;

  /// No description provided for @attendanceBonus.
  ///
  /// In en, this message translates to:
  /// **'Attendance Bonus'**
  String get attendanceBonus;

  /// No description provided for @allowances.
  ///
  /// In en, this message translates to:
  /// **'Allowances'**
  String get allowances;

  /// No description provided for @totalEarnings.
  ///
  /// In en, this message translates to:
  /// **'Total Earnings'**
  String get totalEarnings;

  /// No description provided for @deductionsSection.
  ///
  /// In en, this message translates to:
  /// **'➖ Deductions'**
  String get deductionsSection;

  /// No description provided for @tax.
  ///
  /// In en, this message translates to:
  /// **'Tax'**
  String get tax;

  /// No description provided for @advanceDeduction.
  ///
  /// In en, this message translates to:
  /// **'Advance Deduction'**
  String get advanceDeduction;

  /// No description provided for @unpaidLeave.
  ///
  /// In en, this message translates to:
  /// **'Unpaid Leave'**
  String get unpaidLeave;

  /// No description provided for @otherDeductions.
  ///
  /// In en, this message translates to:
  /// **'Other Deductions'**
  String get otherDeductions;

  /// No description provided for @noneTaxExempt.
  ///
  /// In en, this message translates to:
  /// **'None / Tax (Exempt)'**
  String get noneTaxExempt;

  /// No description provided for @totalDeductions.
  ///
  /// In en, this message translates to:
  /// **'Total Deductions'**
  String get totalDeductions;

  /// No description provided for @netSalaryCaps.
  ///
  /// In en, this message translates to:
  /// **'NET SALARY'**
  String get netSalaryCaps;

  /// No description provided for @verifiedReleasedOn.
  ///
  /// In en, this message translates to:
  /// **'Verified and Released on {date}'**
  String verifiedReleasedOn(String date);

  /// No description provided for @genericTimeFallback.
  ///
  /// In en, this message translates to:
  /// **'time'**
  String get genericTimeFallback;

  /// No description provided for @monthJan.
  ///
  /// In en, this message translates to:
  /// **'Jan'**
  String get monthJan;

  /// No description provided for @monthFeb.
  ///
  /// In en, this message translates to:
  /// **'Feb'**
  String get monthFeb;

  /// No description provided for @monthMar.
  ///
  /// In en, this message translates to:
  /// **'Mar'**
  String get monthMar;

  /// No description provided for @monthApr.
  ///
  /// In en, this message translates to:
  /// **'Apr'**
  String get monthApr;

  /// No description provided for @monthMay.
  ///
  /// In en, this message translates to:
  /// **'May'**
  String get monthMay;

  /// No description provided for @monthJun.
  ///
  /// In en, this message translates to:
  /// **'Jun'**
  String get monthJun;

  /// No description provided for @monthJul.
  ///
  /// In en, this message translates to:
  /// **'Jul'**
  String get monthJul;

  /// No description provided for @monthAug.
  ///
  /// In en, this message translates to:
  /// **'Aug'**
  String get monthAug;

  /// No description provided for @monthSep.
  ///
  /// In en, this message translates to:
  /// **'Sep'**
  String get monthSep;

  /// No description provided for @monthOct.
  ///
  /// In en, this message translates to:
  /// **'Oct'**
  String get monthOct;

  /// No description provided for @monthNov.
  ///
  /// In en, this message translates to:
  /// **'Nov'**
  String get monthNov;

  /// No description provided for @monthDec.
  ///
  /// In en, this message translates to:
  /// **'Dec'**
  String get monthDec;

  /// No description provided for @notApplicable.
  ///
  /// In en, this message translates to:
  /// **'N/A'**
  String get notApplicable;

  /// No description provided for @uploadingImage.
  ///
  /// In en, this message translates to:
  /// **'Uploading image...'**
  String get uploadingImage;

  /// No description provided for @profilePictureUpdated.
  ///
  /// In en, this message translates to:
  /// **'Profile picture updated!'**
  String get profilePictureUpdated;

  /// No description provided for @networkError.
  ///
  /// In en, this message translates to:
  /// **'Network error'**
  String get networkError;

  /// No description provided for @uploadFailed.
  ///
  /// In en, this message translates to:
  /// **'Upload failed: {error}'**
  String uploadFailed(String error);

  /// No description provided for @currentPassword.
  ///
  /// In en, this message translates to:
  /// **'Current Password'**
  String get currentPassword;

  /// No description provided for @passwordMinLength.
  ///
  /// In en, this message translates to:
  /// **'Password must be at least 6 characters'**
  String get passwordMinLength;

  /// No description provided for @passwordChangedSuccessfully.
  ///
  /// In en, this message translates to:
  /// **'Password changed successfully!'**
  String get passwordChangedSuccessfully;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @empCode.
  ///
  /// In en, this message translates to:
  /// **'Emp Code'**
  String get empCode;

  /// No description provided for @joined.
  ///
  /// In en, this message translates to:
  /// **'Joined'**
  String get joined;

  /// No description provided for @viewLess.
  ///
  /// In en, this message translates to:
  /// **'View Less'**
  String get viewLess;

  /// No description provided for @viewMoreDetails.
  ///
  /// In en, this message translates to:
  /// **'View More Details'**
  String get viewMoreDetails;

  /// No description provided for @attachProof.
  ///
  /// In en, this message translates to:
  /// **'Attach Proof'**
  String get attachProof;

  /// No description provided for @takePhoto.
  ///
  /// In en, this message translates to:
  /// **'Take Photo'**
  String get takePhoto;

  /// No description provided for @recordVideo.
  ///
  /// In en, this message translates to:
  /// **'Record Video'**
  String get recordVideo;

  /// No description provided for @choosePhotoFromGallery.
  ///
  /// In en, this message translates to:
  /// **'Choose Photo from Gallery'**
  String get choosePhotoFromGallery;

  /// No description provided for @chooseVideoFromGallery.
  ///
  /// In en, this message translates to:
  /// **'Choose Video from Gallery'**
  String get chooseVideoFromGallery;

  /// No description provided for @attachProofQuestion.
  ///
  /// In en, this message translates to:
  /// **'Attach Proof?'**
  String get attachProofQuestion;

  /// No description provided for @attachProofPrompt.
  ///
  /// In en, this message translates to:
  /// **'Would you like to attach a photo or video of your completed task?'**
  String get attachProofPrompt;

  /// No description provided for @attachMedia.
  ///
  /// In en, this message translates to:
  /// **'Attach Media'**
  String get attachMedia;

  /// No description provided for @untitledTask.
  ///
  /// In en, this message translates to:
  /// **'Untitled Task'**
  String get untitledTask;

  /// No description provided for @low.
  ///
  /// In en, this message translates to:
  /// **'LOW'**
  String get low;

  /// No description provided for @noDescriptionProvided.
  ///
  /// In en, this message translates to:
  /// **'No additional description provided.'**
  String get noDescriptionProvided;

  /// No description provided for @dueDateLabel.
  ///
  /// In en, this message translates to:
  /// **'Due Date: {date}'**
  String dueDateLabel(String date);

  /// No description provided for @noDueDate.
  ///
  /// In en, this message translates to:
  /// **'No Due Date'**
  String get noDueDate;

  /// No description provided for @attachments.
  ///
  /// In en, this message translates to:
  /// **'Attachments'**
  String get attachments;

  /// No description provided for @adminInstructions.
  ///
  /// In en, this message translates to:
  /// **'Admin Instructions'**
  String get adminInstructions;

  /// No description provided for @yourSubmission.
  ///
  /// In en, this message translates to:
  /// **'Your Submission'**
  String get yourSubmission;

  /// No description provided for @submissionNote.
  ///
  /// In en, this message translates to:
  /// **'Submission Note'**
  String get submissionNote;

  /// No description provided for @addNoteOptional.
  ///
  /// In en, this message translates to:
  /// **'Add a note or remark (optional)'**
  String get addNoteOptional;

  /// No description provided for @changeProofFile.
  ///
  /// In en, this message translates to:
  /// **'Change Proof File'**
  String get changeProofFile;

  /// No description provided for @attachPhotoOrVideoProof.
  ///
  /// In en, this message translates to:
  /// **'Attach Photo or Video Proof'**
  String get attachPhotoOrVideoProof;

  /// No description provided for @proofAttachedReady.
  ///
  /// In en, this message translates to:
  /// **'Proof attached and ready to submit!'**
  String get proofAttachedReady;

  /// No description provided for @completedLabel.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get completedLabel;

  /// No description provided for @saveNewProof.
  ///
  /// In en, this message translates to:
  /// **'Save New Proof'**
  String get saveNewProof;

  /// No description provided for @markAsComplete.
  ///
  /// In en, this message translates to:
  /// **'Mark as Complete'**
  String get markAsComplete;

  /// No description provided for @noTasksAssigned.
  ///
  /// In en, this message translates to:
  /// **'No tasks assigned to you.'**
  String get noTasksAssigned;

  /// No description provided for @untitled.
  ///
  /// In en, this message translates to:
  /// **'Untitled'**
  String get untitled;

  /// No description provided for @submittedSuccessfully.
  ///
  /// In en, this message translates to:
  /// **'Submitted successfully!'**
  String get submittedSuccessfully;

  /// No description provided for @enterValidNumber.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid number'**
  String get enterValidNumber;

  /// No description provided for @yes.
  ///
  /// In en, this message translates to:
  /// **'Yes'**
  String get yes;

  /// No description provided for @select.
  ///
  /// In en, this message translates to:
  /// **'Select'**
  String get select;

  /// No description provided for @mySubmissions.
  ///
  /// In en, this message translates to:
  /// **'My Submissions'**
  String get mySubmissions;

  /// No description provided for @noSubmissionsYet.
  ///
  /// In en, this message translates to:
  /// **'No submissions yet'**
  String get noSubmissionsYet;

  /// No description provided for @submissionLabel.
  ///
  /// In en, this message translates to:
  /// **'Submission'**
  String get submissionLabel;

  /// No description provided for @adminFallback.
  ///
  /// In en, this message translates to:
  /// **'Admin'**
  String get adminFallback;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'km'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'km':
      return AppLocalizationsKm();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
