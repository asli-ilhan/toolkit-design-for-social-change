import { redirect } from "next/navigation";

/**
 * Example journey is now shown by the journey detail page with id example-1.
 * This keeps the same content and layout as real journey views (Summary / Steps / Evidence tabs).
 */
export default function ExampleJourneyRedirect() {
  redirect("/journeys/example-1");
}
