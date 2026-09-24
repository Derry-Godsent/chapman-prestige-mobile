# The PIN rules, explained properly

Everything on this page is what the app actually does today. Nothing here is a
plan or a promise. Where the app cannot protect you, it says so instead of
pretending.

---

## What the PIN is for, and what it is not

**It is for this:** opening the app without waiting for a text message every time.
One text message when you sign in, then four digits after that.

**It is not a second password, and it is not a replacement for signing in.** The
real proof of who you are is the six digit code sent to your phone number. The PIN
is a lock on the door of a house you have already been let into.

That distinction answers most of the questions on this page, including the
important one about a forgotten PIN.

---

## The rules, in one table

| Rule | What it means |
| --- | --- |
| Four digits, nothing else | Exactly 0 to 9, four of them, for example 2048 |
| Never stored as digits | Only a random salt and a scrambled version of the PIN are kept. Reading the phone's storage does not reveal the PIN |
| Kept on this phone only | It is never sent to Chapman, never sent to the database, and never written into the app's records |
| It belongs to one account | The saved PIN records whose it is. A PIN set by one person is never asked of another person who signs in on the same phone |
| Five wrong tries | On the fifth, the PIN is deleted and the customer must prove their phone number again with a text message |
| Changing or removing needs the current PIN | So somebody holding an unlocked phone cannot simply switch the lock off |
| Kept across a sign out | So that signing back in can end with your PIN instead of starting over. It is still deleted when it is forgotten, used up, or removed on purpose |
| Skippable at sign-in | It is offered once. Declining is remembered, and it can be set later from Profile, then App lock |

---

## After the text message, if the PIN is forgotten

This is the question, and the honest answer is that the app does something
different depending on which of two moments it is. Both are correct, and the
difference matters.

### Moment one: finishing a sign-in

You opened the app, tapped sign in, typed your number, and typed the six digit
code that just arrived by text message. Then the app asks for your PIN.

If you do not remember it:

- Tap **Forgot your PIN?**
- The app offers two honest choices: **choose a new 4 digit PIN now**, or
  **carry on without one** and set it later from your profile.
- Either way you are inside the app. You are not sent back to the start.

**Why that is right:** thirty seconds earlier you proved this phone number with a
code sent to it. Asking for another text message at this point would prove nothing
that was not already proved, and sending you back would punish you for forgetting
four digits you set yourself.

### Moment two: opening the app

You opened the app and it showed the PIN screen, because you were already signed
in on this phone.

If you do not remember it:

- Tap **Forgot your PIN?**
- The app tells you plainly what is about to happen: you will be signed out, a new
  six digit code will be texted to your number, and the old PIN will be removed.
  Nothing happens until you agree.
- Once you agree, the app signs out, throws the PIN away, and sends you to the
  sign-in screen for a fresh code.

**Why that is the strict path:** at this moment nothing has proved who is holding
the phone. If a forgotten PIN could simply be tapped through, the lock would be
decoration and any stranger holding an unlocked phone would be inside your
account in two taps. So the only way past is to prove the phone number again.

**It also works the other way:** five wrong tries at either moment remove the PIN
and record that it happened.

---

## The one detail that makes this safe on a shared phone

A PIN used to be deleted when a customer signed out, because it only unlocked a
stored sign-in. It is now kept, and it remembers **whose** it is.

That is what allows this: sign out, sign back in with a new text code, then be
asked for your own PIN, which is the flow you asked for.

It is also what makes it safe: if a different person signs in on that same phone,
the saved PIN is not theirs, so the app drops it and they simply move on. Without
that one detail, the phone would be asking a stranger for somebody else's PIN, and
worse, it would let them through if they guessed it.

---

## A record is kept

Every time a PIN is set, removed, or used up, and every time someone signs in, the
app writes one short line into a small table with the time. There are no digits in
it: only which kind of moment it was and when. The customer can see their own, and
the Chapman office can see all of them.

That is how a quiet PIN reset becomes visible instead of silent. It arrives with
the same file as the birthdays and the ideas list, and it is proved here first: a
customer writes and reads their own, another customer reads nothing, a stranger is
refused outright and cannot write one at all, and a customer cannot write one
against somebody else.

---

## What the PIN honestly cannot do

Three limits, stated plainly rather than hidden.

1. **It cannot stop someone who has your unlocked phone and can read your text
   messages.** That person can tap "Forgot your PIN?", receive the new code on the
   same phone, and be inside. This is true of every app that trusts text messages,
   including banks, and it is the reason the next two items are on the list.

2. **It cannot protect a web browser the way it protects a phone.** On a phone the
   PIN record sits in the operating system's keychain, which the phone itself
   encrypts. In a browser it sits in ordinary browser storage, which anyone using
   that browser can read. Treat the browser version as a convenience lock.

3. **It locks the app, not the account.** A stolen sign-in used somewhere else is
   not stopped by a PIN on this phone. That is a job for the database rules, which
   are separate and are proved in `docs/database-proof/`.

---

## The proper fix, and what I recommend

You asked for a proper secure way to handle a forgotten PIN. There are four real
options, in the order I would do them.

**1. Let the PIN protect the stored sign-in itself, not just the screen.**
Right now the sign-in is saved on the phone, and the PIN guards the screens that
use it. The stronger version keeps the saved sign-in scrambled under a key derived
from the PIN, so that without the PIN there is nothing usable stored at all. This
would make the lock real in the browser too, and it would mean a stolen, unlocked
phone holds nothing that can be used against the account.

This is a structural change to how the app stores the sign-in, so, by your own
rule, I am not building it without showing you first. It is the single biggest
security gain left in the app.

**2. Face ID and Touch ID, with the PIN as the fallback.**
Already agreed as the next step and written into the roadmap. It replaces typing
four digits, and it raises the bar a lot, because a fingerprint or a face cannot be
guessed by somebody holding the phone. The PIN rules above stay underneath it, and
the five tries still apply to the PIN.

**3. Lock the app again after a while in the background.**
Today, once you have opened the app with your PIN, it stays open until it is closed
completely. The stricter version asks for the PIN again after, say, five minutes in
the background. It is a small change, but it is a change to how the app behaves, so
it is your call whether that friction is worth it.

**4. Tell the customer when a PIN is set or reset.**
The record already exists now. The natural next step is to show it in the app, so a
customer can see "PIN removed, 3:14pm" and know something happened they did not do.
That is one more screen, and it needs no database changes.

**My recommendation:** do them in that order, and do the first one before the public
launch, because it is the only one that closes the honest gap in item 1 of the
limits above. Options 2 and 3 together make the everyday experience better, and
option 4 makes a problem visible when everything else fails.
