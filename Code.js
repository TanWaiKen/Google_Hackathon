function doGet() {
  var html = HtmlService.createHtmlOutputFromFile('Index');
  return html;
}

/**
 * Function to search for emails from the last 1 days,
 * and create calendar events for each relevant email.
 */
function getEvents() {
  // Search for all emails received today
  var threads = GmailApp.search('newer_than:1d');
  Logger.log(`Number of threads found: ${threads.length}`);

  if (threads.length === 0) {
    Logger.log('No emails found.');
    return;
  }

  // Get messages from threads
  var messages = GmailApp.getMessagesForThreads(threads);

  if (!Array.isArray(messages)) {
    Logger.log('Error: messages is not an array.');
    return;
  }

  messages.forEach(function(threadMessages, index) {
    if (!Array.isArray(threadMessages)) {
      Logger.log(`Error: threadMessages at index ${index} is not an array.`);
      return;
    }

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
  var dateRegex = /\b(\d{1,2}\s(?:January|February|March|April|May|June|July|August|September|October|November|December)\s\d{4})\b/i;
  var dateRegex2 = /\b(\d{2}-\d{2}-\d{4})\b/i; // New regex to match dates in format DD-MM-YYYY
  var dateRangeRegex = /\b((?:\d{1,2}\s)?(?:January|February|March|April|May|June|July|August|September|October|November|December)\s\d{1,2}(?:,\s\d{4})?)\s*-\s*((?:\d{1,2}\s)?(?:January|February|March|April|May|June|July|August|September|October|November|December)\s\d{1,2},\s\d{4})\b/i;
  var timeRegex = /(\d{1,2}:\d{2}\s*[APMapm]{2}|\d{1,2}\s*[APMapm]{2})\s*-\s*(\d{1,2}:\d{2}\s*[APMapm]{2}|\d{1,2}\s*[APMapm]{2})/i;

  var dateMatch = body.match(dateRegex);
  var dateMatch2 = body.match(dateRegex2);
  var dateRangeMatch = body.match(dateRangeRegex);
  var timeMatch = body.match(timeRegex);

  var startTime, endTime;

  if (dateRangeMatch) {
    var startDateStr = dateRangeMatch[1];
    var endDateStr = dateRangeMatch[2];

    // Handle incomplete start dates (e.g., "Aug 2 - 18, 2024")
    if (!/\d{4}/.test(startDateStr)) {
      startDateStr += endDateStr.match(/\s\d{4}$/)[0];
    }

    var startDate = new Date(startDateStr);
    var endDate = new Date(endDateStr);

    var formattedStartDateStr = startDate.toISOString().split('T')[0];
    var formattedEndDateStr = endDate.toISOString().split('T')[0];

    if (timeMatch) {
      var startTimeStr = timeMatch[1];
      var endTimeStr = timeMatch[2];
      startTime = new Date(`${formattedStartDateStr} ${startTimeStr}`);
      endTime = new Date(`${formattedEndDateStr} ${endTimeStr}`);
    } else {
      // Default time if not specified
      startTime = new Date(formattedStartDateStr);
      endTime = new Date(formattedEndDateStr);
    }

    return { startTime, endTime };
  } else if (dateMatch || dateMatch2) {
    var dateStr = dateMatch ? dateMatch[1] : dateMatch2[1];
    var date;

    if (dateMatch2) {
      var parts = dateStr.split('-');
      date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
      date = new Date(dateStr);
    }

    var formattedDateStr = date.toISOString().split('T')[0];

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
    console.log('No date found in email body.');
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
  var currentDate = new Date();
  var startTime = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate());
  var endTime = new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), currentDate.getDate());
  
  var events = calendar.getEvents(startTime, endTime);
  Logger.log('Number of events found: ' + events.length);

  // Iterate through each event and delete it
  events.forEach(function(event) {
    Logger.log('Deleting event: ' + event.getTitle());
    event.deleteEvent();
  });
}
