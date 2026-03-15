# Voice-to-Text Integration Guide

## Overview
The `VoiceInputComponent.tsx` provides production-ready **Web Speech API** integration for your clinical hub. Patients can now record their thoughts instead of typing, perfect for times when they're tired, emotional, or prefer verbal expression.

---

## 📦 Complete Component Suite

### 1. **VoiceInputButton** (Just the Mic)
Use when you already have a text field and just need the mic button.

```tsx
import { VoiceInputButton } from '@/components/patient/VoiceInputComponent';

// In your component:
const [fieldValue, setFieldValue] = useState('');
const [isListening, setIsListening] = useState(false);

return (
  <VoiceInputButton
    fieldId="thought-record-situation"
    currentValue={fieldValue}
    onUpdate={setFieldValue}
    isListening={isListening}
    onListeningChange={setIsListening}
    label="Use Voice Input"
  />
);
```

---

### 2. **VoiceTextArea** (Textarea + Mic Button)
Complete solution with textarea and voice button.

```tsx
import { VoiceTextArea } from '@/components/patient/VoiceInputComponent';

return (
  <VoiceTextArea
    value={situation}
    onChange={(value) => setState('situation', value)}
    placeholder="Describe the situation..."
    rows={5}
    fieldId="thought-situation"
    label="Use Voice Input"
  />
);
```

---

### 3. **VoiceInputField** (Single-line Input + Mic Button)
For shorter fields like task names, belief statements, etc.

```tsx
import { VoiceInputField } from '@/components/patient/VoiceInputComponent';

return (
  <VoiceInputField
    value={taskName}
    onChange={setTaskName}
    placeholder="What task will you complete?"
    fieldId="activity-task"
    label="Use Voice Input"
  />
);
```

---

## 🎯 Usage Examples by CBT Template

### **Thought Record: Situation Step**
```tsx
function ThoughtRecordStep1() {
  const [situation, setSituation] = useState('');

  return (
    <div>
      <h3 className="text-xl font-semibold">What happened?</h3>
      <VoiceTextArea
        value={situation}
        onChange={setSituation}
        placeholder="Describe the triggering situation..."
        rows={5}
        fieldId="thought-situation"
      />
    </div>
  );
}
```

### **Activity Scheduler: Task Selection**
```tsx
function ActivitySchedulerStep1() {
  const [task, setTask] = useState('');

  return (
    <div>
      <h3 className="text-xl font-semibold">Choose a meaningful task</h3>
      <VoiceInputField
        value={task}
        onChange={setTask}
        placeholder="What will you do today?"
        fieldId="activity-task"
      />
    </div>
  );
}
```

### **Worry Postponement: Record Worry**
```tsx
function WorryPostponementStep1() {
  const [worry, setWorry] = useState('');

  return (
    <div>
      <h3 className="text-xl font-semibold">What are you worried about?</h3>
      <VoiceTextArea
        value={worry}
        onChange={setWorry}
        placeholder="Express your worry..."
        rows={4}
        fieldId="worry-record"
      />
    </div>
  );
}
```

### **Socratic Perspective: State Your Belief**
```tsx
function SocraticStep1() {
  const [belief, setBelief] = useState('');
  const [isListening, setIsListening] = useState(false);

  return (
    <div>
      <h3 className="text-xl font-semibold">State your core belief</h3>
      <VoiceTextArea
        value={belief}
        onChange={setBelief}
        placeholder="What do you believe about this situation?"
        rows={4}
        fieldId="socratic-belief"
      />
    </div>
  );
}
```

### **Exposure Ladder: List Fears**
```tsx
function ExposureLadderStep1() {
  const [fears, setFears] = useState(['', '', '', '', '']);

  const handleFearChange = (index: number, value: string) => {
    const next = [...fears];
    next[index] = value;
    setFears(next);
  };

  return (
    <div>
      <h3 className="text-xl font-semibold">List 5 fears from easiest to hardest</h3>
      <div className="space-y-2">
        {fears.map((fear, index) => (
          <div key={`fear-${index}`}>
            <VoiceInputField
              value={fear}
              onChange={(value) => handleFearChange(index, value)}
              placeholder={`Fear ${index + 1}`}
              fieldId={`exposure-fear-${index}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🎤 How Voice Input Works (User Experience)

### **Patient's Journey:**

1. **Patient sees the mic button** next to a text field
   - Button says "Use Voice Input"
   - Subtle mic icon

2. **Patient clicks the mic button**
   - Browser requests microphone permission (first time only)
   - Button changes to "Listening..." with animated wave bars
   - Toast notification: "Listening... Speak clearly into your microphone."

3. **Patient speaks their thoughts**
   - Speech recognized in real-time
   - Text appears in the field as they speak
   - Multiple sentences are captured

4. **Patient stops speaking**
   - After ~1-2 seconds of silence, recognition auto-stops
   - Button returns to "Use Voice Input"
   - Text is now ready for editing (patient can add/remove text)

5. **Patient can edit or continue**
   - If they want to add more, click the mic again
   - Extends existing text (doesn't replace)
   - Or they can manually type corrections

---

## ⚙️ Advanced Configuration

### **Custom Language Support**
```tsx
<VoiceInputButton
  fieldId="multi-lang"
  currentValue={value}
  onUpdate={setValue}
  language="es-ES"  // Spanish
  label="Usar entrada de voz"
/>
```

Supported languages: `en-US`, `es-ES`, `fr-FR`, `de-DE`, `it-IT`, `pt-BR`, `ja-JP`, `zh-CN`, etc.

### **Custom Label**
```tsx
<VoiceInputButton
  fieldId="custom-label"
  currentValue={value}
  onUpdate={setValue}
  label="Speak Your Truth"
/>
```

### **Controlled Listening State** (for multiple fields)
```tsx
function MultiFieldComponent() {
  const [listeningField, setListeningField] = useState<string | null>(null);
  const [field1, setField1] = useState('');
  const [field2, setField2] = useState('');

  return (
    <>
      <VoiceInputButton
        fieldId="field-1"
        currentValue={field1}
        onUpdate={setField1}
        isListening={listeningField === 'field-1'}
        onListeningChange={(listening) => 
          setListeningField(listening ? 'field-1' : null)
        }
      />
      <VoiceInputButton
        fieldId="field-2"
        currentValue={field2}
        onUpdate={setField2}
        isListening={listeningField === 'field-2'}
        onListeningChange={(listening) => 
          setListeningField(listening ? 'field-2' : null)
        }
      />
    </>
  );
}
```

---

## 🔒 Error Handling & Browser Support

### **Automatic Error Handling**
- ✅ Checks browser support (Chrome, Firefox, Edge, Safari)
- ✅ Requests microphone permission
- ✅ Handles network errors gracefully
- ✅ Shows friendly error messages via toast notifications

### **Toast Messages Provided**
- "Listening... Speak clearly into your microphone."
- "Voice input is not supported in your browser. Please use Chrome, Firefox, or Edge."
- "Voice capture failed. Please check your microphone and try again."

### **Browser Compatibility**
| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Native Web Speech API |
| Firefox | ✅ Full | Stable support |
| Edge | ✅ Full | Chromium-based |
| Safari | ✅ Limited | iOS 14.5+, older versions may have issues |
| Opera | ✅ Full | Chromium-based |
| IE 11 | ❌ None | Not supported |

---

## 🎨 Styling & Customization

### **Button States**
- **Idle:** Gray border, white background, charcoal text
- **Listening:** Sage border, sage background, animated waves
- **Disabled:** Grayed out, not clickable

### **Customize Colors**
Edit the className in `VoiceInputButton`:
```tsx
// Current styling (Wellness Design System)
className={`border px-4 py-2 text-xs font-semibold transition ${
  listening
    ? 'border-calm-sage bg-calm-sage/10 text-calm-sage'        // Listening state
    : 'border-charcoal/20 bg-white text-charcoal hover:...'    // Idle state
}`}
```

Change to your brand colors:
```tsx
// Example: Blue theme
? 'border-blue-500 bg-blue-50 text-blue-600'
: 'border-gray-300 bg-white text-gray-800'
```

---

## 📊 Integration Checklist

- [ ] Import `VoiceInputComponent` in your CBT template files
- [ ] Replace plain `<textarea>` with `<VoiceTextArea>` where appropriate
- [ ] Replace plain `<input>` with `<VoiceInputField>` for single-line fields
- [ ] Add `import { VoiceTextArea, VoiceInputField, VoiceInputButton } from '@/components/patient/VoiceInputComponent';`
- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test microphone permission flow
- [ ] Verify toast notifications appear correctly
- [ ] Test with quiet voices and accents
- [ ] Verify wave bar animations smooth
- [ ] Test on mobile (iOS/Android)

---

## 🚀 Performance Tips

1. **Debounce updates:** If processing many characters, debounce `onUpdate`
2. **Memoize components:** Use `React.memo()` for expensive renders
3. **Audio context:** Component handles Web Speech API lifecycle automatically
4. **Memory cleanup:** Built-in cleanup on unmount prevents memory leaks

---

## 🔧 Troubleshooting

### **Mic button not appearing?**
- Check imports are correct
- Verify component file is in `/src/components/patient/`
- Check console for TypeScript errors

### **Microphone permission denied?**
- User must grant browser permission on first use
- Check browser settings → Privacy → Microphone
- Try different browser if issue persists

### **Text not appearing?**
- Check `onChange` handler is update state correctly
- Verify `value` prop is bound to the state
- Check browser console for errors

### **Wave bars not animating?**
- Verify Framer Motion is installed (`npm list framer-motion`)
- Check CSS animations are not globally disabled
- Try refreshing page

---

## 📞 Support

For issues or feature requests:
1. Check browser console for errors
2. Test in Chrome (most reliable)
3. Verify microphone works in other apps
4. Clear browser cache and reload

---

## Next Steps

1. **Integrate into all 5 CBT templates** using examples above
2. **Test voice input** with real patients during therapy sessions
3. **Gather feedback** on transcription accuracy and UX
4. **Monitor** which fields get most voice usage
5. **Consider** server-side speech-to-text if accuracy issues arise

Your patients will love the ability to express their clinical thoughts without the burden of typing! 🎙️✨
