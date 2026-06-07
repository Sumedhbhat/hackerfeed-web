import { useEffect, useEffectEvent } from "react";
import { signIn, useAuthSession } from "./useAuthSession";

type UserOrNull = ReturnType<typeof useAuthSession>["user"];

export const useUser = (): UserOrNull => {
	const { user, isLoading } = useAuthSession();
	const onUnauthenticated = useEffectEvent(() => {
		signIn(window.location.pathname);
	});

	useEffect(() => {
		if (!isLoading && !user) {
			onUnauthenticated();
		}
	}, [isLoading, user]);

	return user;
};
