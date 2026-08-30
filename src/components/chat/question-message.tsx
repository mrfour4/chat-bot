export function QuestionMessage({ content }: { content: string }) {
    return (
        <li className="flex justify-end">
            <p className="max-w-[85%] rounded-lg rounded-br-sm bg-ink px-4 py-2.5 text-sm leading-relaxed text-paper">
                {content}
            </p>
        </li>
    );
}
