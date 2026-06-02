import 'package:flutter/material.dart';

class LeaveProvider extends ChangeNotifier {
  dynamic _selectedType;
  DateTime? _startDate;
  DateTime? _endDate;
  final TextEditingController reasonController = TextEditingController();

  dynamic get selectedType => _selectedType;
  DateTime? get startDate => _startDate;
  DateTime? get endDate => _endDate;

  void setLeaveType(dynamic type) {
    _selectedType = type;
    notifyListeners();
  }

  void setDates(DateTime? start, DateTime? end) {
    _startDate = start;
    _endDate = end;
    notifyListeners();
  }

  void clear() {
    _selectedType = null;
    _startDate = null;
    _endDate = null;
    reasonController.clear();
    notifyListeners();
  }
}
