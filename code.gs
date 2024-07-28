function doGet() {
  var html = HtmlService.createHtmlOutputFromFile('Index');
  return html
}

/**
 * Function to search for emails from the last 10 days,
 * and create calendar events for each relevant email.
 */
function getEvents() {
  // Search for all emails received in the last 10 days
  var threads = GmailApp.search('newer_than:3d');
  Logger.log(`Number of threads found: ${threads.length}`);

  if (threads.length === 0) {
    Logger.log('No emails found.');
    return;
  }

  // Get messages from threads
  var messages = GmailApp.getMessagesForThreads(threads);
  messages.forEach(function(threadMessages) {
    threadMessages.forEach(function(message) {
      var subject = message.getSubject();
      var body = message.getPlainBody(); // Use getPlainBody() to avoid HTML tags
      var messageId = message.getId();
      var emailLink = `https://mail.google.com/mail/u/0/#inbox/${messageId}`;

      // Check for event-related keywords
      var keywords = /(event|workshop|hackathon|ticket|exam|meeting|conference|webinar)/i;
      if (!keywords.test(subject + body)) {
        Logger.log('No event-related keywords found in email.');
        return;
      }

      Logger.log(`Processing email with subject: ${subject}`);
      
      // Extract meeting details
      var details = extractDetails(body);

      if (details) {
        var { startTime, endTime } = details;

        // Create calendar event
        createCalendarEvent(subject, emailLink, startTime, endTime);
      }
    });
  });
}

/**
 * Function to extract meeting details from email body.
 * @param {string} body - The email body content.
 * @returns {Object|null} - An object with startTime and endTime, or null if not found.
 */
function extractDetails(body) {
  // Enhanced regex to match meeting date and time in various formats
  var dateRegex = /\b(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}|\b(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4})\b/i;
  var timeRegex = /(\d{1,2}:\d{2}\s*[APMapm]{2}|\d{1,2}\s*[APMapm]{2})\s*-\s*(\d{1,2}:\d{2}\s*[APMapm]{2}|\d{1,2}\s*[APMapm]{2})/i;
  var dayOfWeekRegex = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i;
  
  var dateMatch = body.match(dateRegex);
  var timeMatch = body.match(timeRegex);
  var dayOfWeekMatch = body.match(dayOfWeekRegex);

  var startTime, endTime;

  if (dateMatch || dayOfWeekMatch) {
    var dateStr = dateMatch ? dateMatch[1].replace(/\//g, '-').replace(/-/g, ' ') : '';
    var today = new Date();
    var year = today.getFullYear();
    
    if (dateStr.includes('-') || dateStr.includes('/')) {
      // Parsing dates in format DD/MM/YYYY or DD-MM-YYYY
      var dateParts = dateStr.split(/[\/-]/);
      var day = parseInt(dateParts[0], 10);
      var month = parseInt(dateParts[1], 10) - 1; // Months are 0-based in JavaScript Date
      var year = parseInt(dateParts[2], 10);
      var dateObj = new Date(year, month, day);
      dateStr = dateObj.toLocaleDateString("en-US");
    } else if (dateStr) {
      // Parsing dates in format "Month DD, YYYY"
      dateStr = new Date(dateStr).toLocaleDateString("en-US");
    } else {
      // If only day of the week is given
      var dayOfWeek = dayOfWeekMatch[1];
      var dayIndex = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].indexOf(dayOfWeek);
      var todayIndex = today.getDay();
      var daysUntilEvent = (dayIndex >= todayIndex) ? dayIndex - todayIndex : 7 - (todayIndex - dayIndex);
      var eventDate = new Date();
      eventDate.setDate(today.getDate() + daysUntilEvent);
      dateStr = eventDate.toLocaleDateString("en-US");
    }

    Logger.log('Formatted date string: ' + dateStr);

    // Convert the dateStr from MM/DD/YYYY to YYYY-MM-DD
    var formattedDateParts = dateStr.split('/');
    var formattedDateStr = `${formattedDateParts[2]}-${formattedDateParts[0]}-${formattedDateParts[1]}`;

    if (timeMatch) {
      var startTimeStr = timeMatch[1];
      var endTimeStr = timeMatch[2];
      startTime = new Date(`${formattedDateStr} ${startTimeStr}`);
      endTime = new Date(`${formattedDateStr} ${endTimeStr}`);
    } else {
      // Default time if not specified
      startTime = new Date(formattedDateStr);
      endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Default to 1 hour
    }

    return { startTime, endTime };
  } else {
    Logger.log('No date found in email body.');
    return null;
  }
}



/**
 * Function to create a calendar event.
 * @param {string} title - The event title.
 * @param {string} description - The event description.
 * @param {Date} startTime - The event start time.
 * @param {Date} endTime - The event end time.
 */
function createCalendarEvent(title, description, startTime, endTime) {
  var calendar = CalendarApp.getDefaultCalendar();
  calendar.createEvent(title, startTime, endTime, {
    description: description
  });
  Logger.log(`Event created: ${title} from ${startTime} to ${endTime}`);
}


/**
 * Function to delete all events from the default calendar.
 */
function deleteAllCalendarEvents() {
  var calendar = CalendarApp.getDefaultCalendar();
  
  // Define a wide date range to cover all possible events
  var startTime = new Date('2000-01-01');
  var endTime = new Date('2100-01-01');
  
  var events = calendar.getEvents(startTime, endTime);
  Logger.log('Number of events found: ' + events.length);

  // Iterate through each event and delete it
  events.forEach(function(event) {
    Logger.log('Deleting event: ' + event.getTitle());
    event.deleteEvent();
  });
}
