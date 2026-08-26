package iuh.fit.se.interview.interview;

import biweekly.Biweekly;
import biweekly.ICalendar;
import biweekly.component.VEvent;
import biweekly.property.Organizer;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.util.Date;

@Service
public class IcsService {

    public String generate(Interview interview) {
        ICalendar ical = new ICalendar();
        ical.setProductId("-//ATS//Interview Scheduling//VI");

        VEvent event = new VEvent();
        event.setSummary("Phỏng vấn — " + interview.getCandidateNameSnapshot());

        StringBuilder description = new StringBuilder();
        description.append("Ứng viên: ").append(interview.getCandidateNameSnapshot());
        if (interview.getFormat() == InterviewFormat.ONLINE && interview.getMeetingLink() != null) {
            description.append("\\nLink họp: ").append(interview.getMeetingLink());
        }
        if (interview.getNote() != null && !interview.getNote().isBlank()) {
            description.append("\\nGhi chú: ").append(interview.getNote());
        }
        event.setDescription(description.toString());

        if (interview.getLocation() != null && !interview.getLocation().isBlank()) {
            event.setLocation(interview.getLocation());
        } else if (interview.getMeetingLink() != null) {
            event.setLocation(interview.getMeetingLink());
        }

        Date start = Date.from(interview.getScheduledAt().atZone(ZoneId.systemDefault()).toInstant());
        Date end = Date.from(interview.getScheduledAt()
                .plusMinutes(interview.getDurationMinutes() != null ? interview.getDurationMinutes() : 60)
                .atZone(ZoneId.systemDefault()).toInstant());
        event.setDateStart(start);
        event.setDateEnd(end);
        event.setUid("interview-" + interview.getId() + "@ats");
        event.setOrganizer(new Organizer(null, "noreply@ats.local"));
        event.setDateTimeStamp(Date.from(Instant.now()));

        ical.addEvent(event);
        return Biweekly.write(ical).go();
    }
}
