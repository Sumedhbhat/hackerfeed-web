import { useAuth } from "@workos-inc/authkit-react";
import { useEffect, useEffectEvent } from "react";

type UserOrNull = ReturnType<typeof useAuth>["user"];

export const useUser = (): UserOrNull => {
	const { user, isLoading, signIn } = useAuth();
	const onUnauthenticated = useEffectEvent(() => {
		signIn({
			state: { returnTo: window.location.pathname },
		});
	});

	useEffect(() => {
		if (!isLoading && !user) {
			onUnauthenticated();
		}
	}, [isLoading, user]);

	return user;
};
